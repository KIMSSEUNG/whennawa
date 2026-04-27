from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

import psycopg

from db.repository import RagChunkSearchResult, search_rag_chunks


DebugFn = Callable[[str], None]


@dataclass(slots=True)
class RagStageResult:
    # 한 단계의 검색 결과를 담는다.
    stage_name: str
    query_text: str
    chunks: list[RagChunkSearchResult]


@dataclass(slots=True)
class RagContextBundle:
    # 3단계 검색의 최종 결과와 LLM 입력용 텍스트를 함께 담는다.
    job_post: RagStageResult
    experience: RagStageResult
    company_profile: RagStageResult
    context_text: str


class RagContextService:
    # 1차, 2차, 3차 검색을 단계적으로 수행한다.
    def __init__(
        self,
        *,
        job_post_top_k: int = 3,
        experience_top_k: int = 3,
        company_profile_top_k: int = 3,
        query_text_limit: int = 2500,
    ) -> None:
        self._job_post_top_k = job_post_top_k
        self._experience_top_k = experience_top_k
        self._company_profile_top_k = company_profile_top_k
        self._query_text_limit = query_text_limit

    def build_three_stage_context(
        self,
        conn: psycopg.Connection,
        *,
        user_id: str,
        essay_prompt: str,
        target_position: str,
        embedding_service,
        job_post_source_ids: list[int] | None = None,
        experience_source_ids: list[int] | None = None,
        company_profile_source_ids: list[int] | None = None,
        debug: DebugFn | None = None,
    ) -> RagContextBundle:
        # 1차: 문항을 기준으로 채용공고 chunk를 찾는다.
        job_post_query = self._build_query_text(
            essay_prompt=essay_prompt,
            target_position=target_position,
        )
        job_post_chunks = search_rag_chunks(
            conn,
            query_text=job_post_query,
            embedding_service=embedding_service,
            top_k=self._job_post_top_k,
            user_id=user_id,
            source_types=["job_post"],
            source_tables=["application_entries"],
            source_ids=job_post_source_ids,
            debug=debug,
        )
        job_post_stage = RagStageResult(
            stage_name="job_post",
            query_text=job_post_query,
            chunks=job_post_chunks,
        )
        self._log_stage_results(debug, job_post_stage)

        # 2차: 문항 + 공고 chunk를 기준으로 경험 chunk를 찾는다.
        experience_query = self._build_query_text(
            essay_prompt=essay_prompt,
            target_position=target_position,
            related_chunks=job_post_chunks,
        )
        experience_chunks = search_rag_chunks(
            conn,
            query_text=experience_query,
            embedding_service=embedding_service,
            top_k=self._experience_top_k,
            user_id=user_id,
            source_types=["experience"],
            source_tables=["experience_entries"],
            source_ids=experience_source_ids,
            debug=debug,
        )
        experience_stage = RagStageResult(
            stage_name="experience",
            query_text=experience_query,
            chunks=experience_chunks,
        )
        self._log_stage_results(debug, experience_stage)

        # 3차: 문항 + 공고 chunk + 직무를 기준으로 회사정보 chunk를 찾는다.
        company_query = self._build_query_text(
            essay_prompt=essay_prompt,
            target_position=target_position,
            related_chunks=job_post_chunks,
        )
        company_chunks = search_rag_chunks(
            conn,
            query_text=company_query,
            embedding_service=embedding_service,
            top_k=self._company_profile_top_k,
            user_id=user_id,
            source_types=["company_profile"],
            source_tables=["crawl_snapshots"],
            source_ids=company_profile_source_ids,
            debug=debug,
        )
        company_stage = RagStageResult(
            stage_name="company_profile",
            query_text=company_query,
            chunks=company_chunks,
        )
        self._log_stage_results(debug, company_stage)

        context_text = self._render_context(
            essay_prompt=essay_prompt,
            target_position=target_position,
            job_post_chunks=job_post_chunks,
            experience_chunks=experience_chunks,
            company_chunks=company_chunks,
        )

        if debug:
            debug(
                "rag context built "
                f"job_post={len(job_post_chunks)} "
                f"experience={len(experience_chunks)} "
                f"company_profile={len(company_chunks)} "
                f"context_len={len(context_text)}"
            )

        return RagContextBundle(
            job_post=job_post_stage,
            experience=experience_stage,
            company_profile=company_stage,
            context_text=context_text,
        )

    def _log_stage_results(
        self,
        debug: DebugFn | None,
        stage: RagStageResult,
    ) -> None:
        if not debug:
            return

        debug(
            "rag stage results "
            f"stage={stage.stage_name} "
            f"query_len={len(stage.query_text)} "
            f"chunk_count={len(stage.chunks)}"
        )
        for index, chunk in enumerate(stage.chunks, start=1):
            preview = " ".join(chunk.chunk_text.split())[:80]
            debug(
                "rag stage picked "
                f"stage={stage.stage_name} "
                f"rank={index} "
                f"src={chunk.source_table}:{chunk.source_id}#{chunk.chunk_index} "
                f"score={chunk.score:.4f} "
                f"preview={preview!r}"
            )

    def _build_query_text(
        self,
        *,
        essay_prompt: str,
        target_position: str,
        related_chunks: list[RagChunkSearchResult] | None = None,
    ) -> str:
        # 문항 + 직무 + 직전 단계에서 뽑힌 chunk 내용을 합쳐 검색 쿼리를 만든다.
        parts = [
            "자소서 문항:",
            essay_prompt.strip(),
            "지원 직무:",
            target_position.strip(),
        ]
        if related_chunks:
            parts.append("관련 chunk:")
            parts.extend(chunk.chunk_text.strip() for chunk in related_chunks if chunk.chunk_text)

        query_text = "\n".join(part for part in parts if part)
        return query_text[: self._query_text_limit]

    def _render_context(
        self,
        *,
        essay_prompt: str,
        target_position: str,
        job_post_chunks: list[RagChunkSearchResult],
        experience_chunks: list[RagChunkSearchResult],
        company_chunks: list[RagChunkSearchResult],
    ) -> str:
        # LLM 입력용 context는 섹션별로 분리한다.
        sections = [
            "### 자소서 문항",
            essay_prompt.strip(),
            "",
            "### 지원 직무",
            target_position.strip(),
            "",
            self._render_chunk_section("### job_post", job_post_chunks),
            "",
            self._render_chunk_section("### experience", experience_chunks),
            "",
            self._render_chunk_section("### company_profile", company_chunks),
        ]
        return "\n".join(part for part in sections if part is not None).strip()

    def _render_chunk_section(
        self,
        header: str,
        chunks: list[RagChunkSearchResult],
    ) -> str:
        if not chunks:
            return f"{header}\n(검색 결과 없음)"

        lines = [header]
        for index, chunk in enumerate(chunks, start=1):
            source_tag = f"{chunk.source_table}:{chunk.source_id}#{chunk.chunk_index}"
            lines.append(
                f"{index}. [{source_tag}] score={chunk.score:.4f} distance={chunk.distance:.4f}"
            )
            lines.append(chunk.chunk_text.strip())
            lines.append("")
        return "\n".join(lines).rstrip()


__all__ = [
    "RagContextBundle",
    "RagContextService",
    "RagStageResult",
]
