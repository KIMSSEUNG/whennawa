from pathlib import Path
import sys
from dataclasses import asdict

from fastapi import UploadFile

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from db.connection import open_transaction
    from db.repository import (
        save_crawl_snapshot_and_refresh_chunks,
        save_analysis_result,
        upsert_application_and_refresh_chunks,
        upsert_company,
        upsert_crawl_source,
        upsert_experience_and_refresh_chunks,
    )
    from schemas.job_post_schema import JobPostAnalyzeResponse
    from services.company_crawl_service import CompanyCrawlError, CompanyCrawlService
    from services.job_post_parser_service import JobPostParserService
    from services.llm_service import LLMProviderUnavailableError
    from services.rag_context_service import RagContextService
    from services.ocr_service import OCRExecutionError, OCRProviderUnavailableError
    from utils.image_utils import InvalidImageError, validate_image_upload
except ModuleNotFoundError:
    from backend.db.connection import open_transaction
    from backend.db.repository import (
        save_crawl_snapshot_and_refresh_chunks,
        save_analysis_result,
        upsert_application_and_refresh_chunks,
        upsert_company,
        upsert_crawl_source,
        upsert_experience_and_refresh_chunks,
    )
    from backend.schemas.job_post_schema import JobPostAnalyzeResponse
    from backend.services.company_crawl_service import (
        CompanyCrawlError,
        CompanyCrawlService,
    )
    from backend.services.job_post_parser_service import JobPostParserService
    from backend.services.llm_service import LLMProviderUnavailableError
    from backend.services.rag_context_service import RagContextService
    from backend.services.ocr_service import OCRExecutionError, OCRProviderUnavailableError
    from backend.utils.image_utils import InvalidImageError, validate_image_upload


class JobPostAnalysisService:
    def __init__(
        self,
        parser_service: JobPostParserService,
        company_crawl_service: CompanyCrawlService,
    ) -> None:
        self._parser_service = parser_service
        self._company_crawl_service = company_crawl_service
        self._rag_context_service = RagContextService()

    async def analyze(
        self,
        *,
        files: list[UploadFile],
        user_id: str,
        company_name: str,
        target_position: str,
        company_url: str,
        experience_text: str,
        essay_prompt: str,
        ocr_test_mode: bool,
        model_services,
        debug,
    ) -> JobPostAnalyzeResponse:
        all_lines: list[str] = []
        raw_parts: list[str] = []
        confidences: list[float] = []

        if ocr_test_mode:
            debug("ocr test mode enabled, using configured test text instead of OCR")
            ocr_result = model_services.ocr.analyze(
                file_bytes=b"",
                filename="ocr-test.txt",
                content_type="text/plain",
                target_position=target_position,
            )
            all_lines.extend(ocr_result.lines)
            if ocr_result.raw_text.strip():
                raw_parts.append(ocr_result.raw_text.strip())
            confidences.append(ocr_result.average_confidence)
        else:
            for index, file in enumerate(files, start=1):
                file_bytes = await file.read()
                validate_image_upload(
                    filename=file.filename or "",
                    content_type=file.content_type,
                    image_bytes=file_bytes,
                )

                debug(
                    "ocr file start "
                    f"index={index} filename={file.filename!r} "
                    f"content_type={file.content_type!r} size={len(file_bytes)}"
                )

                ocr_result = model_services.ocr.analyze(
                    file_bytes=file_bytes,
                    filename=file.filename or f"upload-{index}",
                    content_type=file.content_type,
                    target_position=target_position,
                )

                if ocr_result.lines:
                    all_lines.extend(ocr_result.lines)
                if ocr_result.raw_text.strip():
                    raw_parts.append(ocr_result.raw_text.strip())
                confidences.append(ocr_result.average_confidence)

                debug(
                    "ocr file done "
                    f"index={index} line_count={len(ocr_result.lines)} "
                    f"avg_conf={ocr_result.average_confidence:.4f}"
                )

        combined_raw_text = "\n\n".join(raw_parts).strip()
        combined_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        debug("company crawl start")
        company_profile = await self._company_crawl_service.crawl(company_url, debug=debug)
        company_profile_data = asdict(company_profile)
        debug(
            "company crawl done "
            f"company_name={company_profile.company_name!r} "
            f"headings={len(company_profile.headings)} "
            f"links={len(company_profile.links)} "
            f"raw_len={len(company_profile.raw_text)}"
        )

        if len(combined_raw_text) < 20:
            debug("OCR result is short, continuing with low-confidence structured output")

        parsed = self._parser_service.parse(
            lines=all_lines,
            raw_text=combined_raw_text,
            ocr_confidence=combined_confidence,
            target_position=target_position,
        )
        parsed["companyName"] = company_name
        parsed["companyProfile"] = company_profile_data
        parsed["embeddingSourceText"] = self._build_embedding_source_text(
            company_name=company_name,
            target_position=target_position,
            company_url=company_url,
            ocr_text=combined_raw_text,
            company_text=company_profile.raw_text,
            experience_text=experience_text,
            essay_prompt=essay_prompt,
        )
        if not parsed.get("info"):
            debug("no info lines were collected; returning raw OCR text only")

        # 분석 결과 저장 단계.
        # 지금은 "청크가 어떻게 잘리는지"를 먼저 보는 단계라서
        # 임베딩 API 호출과 rag_chunks 저장은 끈 상태로 실행한다.
        # 나중에 store_chunks=True로 바꾸면 청크 저장 + 임베딩 저장까지 진행된다.
        persisted = self._persist_analysis_artifacts(
            model_services=model_services,
            company_name=company_name,
            user_id=user_id,
            target_position=target_position,
            company_url=company_url,
            essay_prompt=essay_prompt,
            company_profile=company_profile,
            company_profile_data=company_profile_data,
            combined_raw_text=combined_raw_text,
            experience_text=experience_text,
            debug=debug,
        )
        
        # 유사도 기반 유사한 값 추출
        parsed["ragContextText"] = persisted["rag_context"].context_text
        llm_prompt = self._build_essay_generation_prompt(
            company_name=company_name,
            target_position=target_position,
            essay_prompt=essay_prompt,
            rag_context_text=parsed["ragContextText"],
        )

        # LLM 프롬프팅 진행
        try:
            llm_result = model_services.llm.generate(llm_prompt)
            llm_versions = self._parse_llm_essay_versions(llm_result.text)
            parsed["essayEmotionText"] = llm_versions["emotion"]
            parsed["essayFormalText"] = llm_versions["formal"]
            parsed["essayRawText"] = llm_result.text
            parsed["essayPromptUsed"] = llm_prompt
            parsed["llmProvider"] = llm_result.provider_name
            parsed["llmModel"] = llm_result.model_name
            debug(
                "llm essay generated "
                f"provider={llm_result.provider_name} model={llm_result.model_name} "
                f"emotion_len={len(parsed['essayEmotionText'])} formal_len={len(parsed['essayFormalText'])}"
            )
        except LLMProviderUnavailableError as exc:
            debug(f"llm generation skipped: {exc}")
        except Exception as exc:
            debug(f"llm generation failed: {exc}")

        if parsed.get("essayEmotionText") or parsed.get("essayFormalText"):
            with open_transaction() as conn:
                saved_row = save_analysis_result(
                    conn,
                    user_id=user_id,
                    company_id=persisted["company_row"]["id"],
                    application_id=persisted["application_row"]["id"],
                    experience_id=persisted["experience_row"]["id"],
                    company_name=company_name,
                    target_position=target_position,
                    essay_prompt=essay_prompt,
                    essay_emotion_text=parsed.get("essayEmotionText") or None,
                    essay_formal_text=parsed.get("essayFormalText") or None,
                )
                debug(
                    "analysis result saved "
                    f"analysis_result_id={saved_row['id']} user_id={user_id!r}"
                )

        return JobPostAnalyzeResponse(**parsed)

    def _build_embedding_source_text(
        self,
        *,
        company_name: str,
        target_position: str,
        company_url: str,
        ocr_text: str,
        company_text: str,
        experience_text: str,
        essay_prompt: str,
    ) -> str:
        parts = [
            f"회사명: {company_name}".strip(),
            f"직무: {target_position}".strip(),
            f"회사 URL: {company_url}".strip(),
            "채용공고 OCR:",
            ocr_text.strip(),
            "회사 홈페이지 크롤링:",
            company_text.strip(),
            "경험 텍스트:",
            experience_text.strip(),
            "자소서 문항:",
            essay_prompt.strip(),
        ]
        return "\n".join(part for part in parts if part)

    def _build_essay_generation_prompt(
        self,
        *,
        company_name: str,
        target_position: str,
        essay_prompt: str,
        rag_context_text: str,
    ) -> str:
        sections = [
            self._build_essay_prompt_header(
                company_name=company_name,
                target_position=target_position,
                essay_prompt=essay_prompt,
            ),
            self._build_essay_prompt_context(rag_context_text),
            self._build_essay_prompt_rules(),
            self._build_essay_prompt_output_format(),
        ]
        return "\n\n".join(section for section in sections if section.strip()).strip()

    def _build_essay_prompt_header(
        self,
        *,
        company_name: str,
        target_position: str,
        essay_prompt: str,
    ) -> str:
        return (
            f"당신은 {company_name}의 인사담당자 관점에서 자기소개서를 검토하는 자소서 코치입니다.\n"
            f"아래 제공된 정보를 우선 근거로 사용해 {essay_prompt}에 대한 답변을 완성하세요.\n\n"
            f"[지원 부서/직무 정보 - {target_position}]\n"
            f"[자소서 문항]\n{essay_prompt}"
        )

    def _build_essay_prompt_context(self, rag_context_text: str) -> str:
        return f"[RAG 컨텍스트]\n{rag_context_text}".strip()

    def _build_essay_prompt_rules(self) -> str:
        return (
            "[작성 조건]\n"
            "- 지원자 입장에서 1인칭으로 작성하세요.\n"
            "- 회사 정보, 직무 요구사항, 지원자 경험이 자연스럽게 연결되게 작성하세요.\n"
            "- 추상적인 표현보다 실제 경험과 기여 방향을 중심으로 작성하세요.\n"
            "- 제공된 지원자 경험에 없는 경험, 성과, 수치는 지어내지 마세요.\n"
            "- 회사 정보는 제공된 자료를 우선 사용하되, 일반적으로 알려진 범위의 표현만 보조적으로 사용할 수 있습니다.\n"
            "- 단, 확인되지 않은 회사의 구체적 사업, 수상, 매출, 고객사, 기술명은 지어내지 마세요.\n\n"
            "[공통 조건]\n"
            "- 두괄식으로 핵심 역량과 직무 적합성을 먼저 제시하세요.\n"
            "- 문제 해결 경험, 기술 역량, 기여 방향이 명확히 보이도록 작성하세요.\n\n"
            "1. 감성형 버전\n"
            "- 지원 동기와 가치관이 자연스럽게 드러나도록 작성하세요.\n"
            "- 진정성 있고 부드러운 문체로 작성하세요.\n\n"
            "2. 형식형 버전\n"
            "- 직무 적합성, 기술 역량, 성과 중심으로 작성하세요.\n"
            "- 간결하고 논리적인 문체로 작성하세요."
        )

    def _build_essay_prompt_output_format(self) -> str:
        return (
            "[출력 형식]\n"
            "JSON만 출력하세요.\n"
            "{\n"
            '  "emotion": "...",\n'
            '  "formal": "..."\n'
            "}"
        )

    def _build_self_intro_prompt(
        self,
        *,
        company_name: str,
        target_position: str,
        essay_prompt: str,
        rag_context_text: str,
    ) -> str:
        return f"""
당신은 {company_name}의 인사담당자 관점에서 자기소개서를 검토하는 자소서 코치입니다.
아래 제공된 정보를 우선 근거로 사용해 {essay_prompt}에 대한 답변을 완성하세요.

[지원 부서/직무 정보 - {target_position}]
{rag_context_text}

[자소서 문항]
{essay_prompt}

[작성 조건]
- 지원자 입장에서 1인칭으로 작성하세요.
- 회사 정보, 직무 요구사항, 지원자 경험이 자연스럽게 연결되게 작성하세요.
- 추상적인 표현보다 실제 경험과 기여 방향을 중심으로 작성하세요.
- 제공된 지원자 경험에 없는 경험, 성과, 수치는 지어내지 마세요.
- 회사 정보는 제공된 자료를 우선 사용하되, 일반적으로 알려진 범위의 표현만 보조적으로 사용할 수 있습니다.
- 단, 확인되지 않은 회사의 구체적 사업, 수상, 매출, 고객사, 기술명은 지어내지 마세요.

[최종 출력물]
아래 2개 버전으로 작성하세요.

[공통 조건]
- 두괄식으로 핵심 역량과 직무 적합성을 먼저 제시하세요.
- 문제 해결 경험, 기술 역량, 기여 방향이 명확히 보이도록 작성하세요.

1. 감성형 버전
- 지원 동기와 가치관이 자연스럽게 드러나도록 작성하세요.
- 진정성 있고 부드러운 문체로 작성하세요.

2. 형식형 버전
- 직무 적합성, 기술 역량, 성과 중심으로 작성하세요.
- 간결하고 논리적인 문체로 작성하세요.

[출력 형식]
JSON만 출력하세요.
{{
  "emotion": "...",
  "formal": "..."
}}
""".strip()

    def _parse_llm_essay_versions(self, text: str) -> dict[str, str]:
        import json
        import re

        def _clean(value: str) -> str:
            cleaned = (value or "").strip()
            if not cleaned:
                return ""
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            return cleaned.strip()

        def _extract_from_json_payload(payload: object) -> dict[str, str] | None:
            if not isinstance(payload, dict):
                return None

            emotion = payload.get("emotion") or payload.get("essayEmotionText") or payload.get("emotional")
            formal = payload.get("formal") or payload.get("essayFormalText") or payload.get("polite")

            if emotion is None and formal is None:
                return None

            return {
                "emotion": _clean(str(emotion or "")),
                "formal": _clean(str(formal or "")),
            }

        cleaned = _clean(text)
        if not cleaned:
            return {"emotion": "", "formal": ""}

        json_candidates = [cleaned]
        if cleaned.startswith("```"):
            stripped = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            stripped = re.sub(r"\s*```$", "", stripped)
            json_candidates.append(stripped.strip())

        for candidate in json_candidates:
            try:
                payload = json.loads(candidate)
            except json.JSONDecodeError:
                continue
            parsed = _extract_from_json_payload(payload)
            if parsed is not None:
                return parsed
            if isinstance(payload, list) and payload:
                first = payload[0]
                parsed = _extract_from_json_payload(first)
                if parsed is not None:
                    return parsed

        emotion = ""
        formal = ""

        emotion_match = re.search(
            r"(?:^|\n)\s*(?:emotion|emotional|감성형)\s*[:=]\s*(.*?)(?=(?:\n\s*(?:formal|polite|정돈형)\s*[:=])|$)",
            cleaned,
            re.IGNORECASE | re.DOTALL,
        )
        formal_match = re.search(
            r"(?:^|\n)\s*(?:formal|polite|정돈형)\s*[:=]\s*(.*)$",
            cleaned,
            re.IGNORECASE | re.DOTALL,
        )

        if emotion_match:
            emotion = _clean(emotion_match.group(1))
        if formal_match:
            formal = _clean(formal_match.group(1))

        if emotion or formal:
            return {"emotion": emotion, "formal": formal}

        return {"emotion": cleaned, "formal": cleaned}
    def _persist_analysis_artifacts(
        self,
        *,
        model_services,
        company_name: str,
        user_id: str,
        target_position: str,
        company_url: str,
        essay_prompt: str,
        company_profile,
        company_profile_data: dict,
        combined_raw_text: str,
        experience_text: str,
        debug,
    ) -> dict:
        # 하나의 외부 트랜잭션으로 묶어서,
        # 원본 데이터가 중간에 일부만 저장되는 상황을 줄인다.
        with open_transaction() as conn:
            debug("db save start")

            # 1) 회사 기준 테이블을 먼저 저장한다.
            company_row = upsert_company(
                conn,
                company_name=company_profile.company_name or company_name,
                company_url=company_url,
            )
            debug(
                "db company upsert done "
                f"company_id={company_row['id']} "
                f"normalized_name={company_row['normalized_company_name']!r}"
            )

            # 2) 회사 크롤링 원본을 저장하고, 청크 분할 결과를 로그로 남긴다.
            #    현재는 store_chunks=False라서 임베딩 API 호출과 rag_chunks insert는 하지 않는다.
            crawl_source_row = upsert_crawl_source(
                conn,
                company_id=company_row["id"],
                source_type="company_profile",
                original_url=company_url,
                content_hash=None,
                crawl_status="fetched",
            )
            crawl_result = save_crawl_snapshot_and_refresh_chunks(
                conn,
                user_id="public",
                crawl_source_id=crawl_source_row["id"],
                source_type="company_profile",
                source_text=company_profile.raw_text,
                embedding_service=model_services.embedding,
                raw_html=None,
                metadata={
                    # 크롤링 결과를 나중에 추적할 수 있도록 최소 메타데이터를 남긴다.
                    "final_url": company_profile.final_url,
                    "title": company_profile.title,
                    "description": company_profile.description,
                    "headings": company_profile.headings,
                    "links": company_profile.links,
                    "truncated": company_profile.truncated,
                },
                debug=debug,
                store_chunks=True,
            )
            debug(
                "db company crawl snapshot saved "
                f"crawl_source_id={crawl_source_row['id']} snapshot_id={crawl_result.source_id}"
            )

            # 3) 사용자의 경험 텍스트도 동일하게 청크만 먼저 확인한다.
            experience_row = upsert_experience_and_refresh_chunks(
                conn,
                user_id=user_id,
                title=target_position or company_name,
                raw_text=experience_text,
                embedding_service=model_services.embedding,
                metadata={
                    # MVP에서는 사용자 식별이 단순하므로 최소 정보만 남긴다.
                    "company_name": company_name,
                    "target_position": target_position,
                },
                debug=debug,
                store_chunks=True,
            )
            debug(f"db experience saved experience_id={experience_row['id']}")

            # 4) 지원공고 원본도 청크 분할만 먼저 확인한다.
            application_row = upsert_application_and_refresh_chunks(
                conn,
                user_id=user_id,
                company_id=company_row["id"],
                target_position=target_position,
                company_url=company_url,
                job_post_url=company_profile.final_url,
                raw_text=combined_raw_text,
                embedding_service=model_services.embedding,
                metadata={
                    # 자소서 문항은 저장하지 않고, LLM 입력 시점에만 사용한다.
                    "ocr_source": "uploaded_images",
                    "ocr_line_count": len(combined_raw_text.splitlines()),
                    "company_profile_url": company_profile.final_url,
                    "company_profile": company_profile_data,
                },
                debug=debug,
                store_chunks=True,
            )
            debug(f"db application saved application_id={application_row['id']}")

            debug("db save done")

            rag_context = self._rag_context_service.build_three_stage_context(
                conn,
                user_id=user_id,
                essay_prompt=essay_prompt,
                target_position=target_position,
                embedding_service=model_services.embedding,
                job_post_source_ids=[application_row["id"]],
                experience_source_ids=[experience_row["id"]],
                company_profile_source_ids=[crawl_result.source_id] if crawl_result.source_id else None,
                debug=debug,
            )

            return {
                "company_row": company_row,
                "crawl_result": crawl_result,
                "experience_row": experience_row,
                "application_row": application_row,
                "rag_context": rag_context,
            }


__all__ = [
    "JobPostAnalysisService",
    "InvalidImageError",
    "OCRProviderUnavailableError",
    "OCRExecutionError",
    "CompanyCrawlError",
]
