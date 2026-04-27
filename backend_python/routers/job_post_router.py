from pathlib import Path
import sys
from functools import lru_cache
import traceback
from urllib.parse import urlparse

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from db.connection import open_transaction
    from db.repository import fetch_recent_analysis_results
    from schemas.job_post_schema import JobPostAnalyzeResponse
    from schemas.job_post_schema import JobPostRecentAnalysisItem
    from services.company_crawl_service import CompanyCrawlService
    from services.job_post_analysis_service import (
        CompanyCrawlError,
        InvalidImageError,
        JobPostAnalysisService,
        OCRExecutionError,
        OCRProviderUnavailableError,
    )
    from services.job_post_parser_service import JobPostParserService
    from services.model_stage_service import build_model_stage_services
except ModuleNotFoundError:
    from backend.db.connection import open_transaction
    from backend.db.repository import fetch_recent_analysis_results
    from backend.schemas.job_post_schema import JobPostAnalyzeResponse
    from backend.schemas.job_post_schema import JobPostRecentAnalysisItem
    from backend.services.company_crawl_service import CompanyCrawlService
    from backend.services.job_post_analysis_service import (
        CompanyCrawlError,
        InvalidImageError,
        JobPostAnalysisService,
        OCRExecutionError,
        OCRProviderUnavailableError,
    )
    from backend.services.job_post_parser_service import JobPostParserService
    from backend.services.model_stage_service import build_model_stage_services


router = APIRouter(prefix="/api/job-post", tags=["job-post"])
parser_service = JobPostParserService()
company_crawl_service = CompanyCrawlService()
analysis_service = JobPostAnalysisService(parser_service, company_crawl_service)
MAX_ESSAY_PROMPT_LENGTH = 300


def _debug(message: str) -> None:
    print(f"[job_post_router] {message}", flush=True)


def _user_friendly_crawl_error(message: str) -> str:
    lower_message = message.lower()
    if "companyurl 형식" in lower_message or "invalid url" in lower_message:
        return "공고 URL 형식이 올바르지 않습니다. 주소를 다시 확인해 주세요."
    if "추출 가능한 페이지를 찾지 못했다" in message:
        return "공고 페이지를 불러오지 못했습니다. 해당 URL이 공고 페이지인지 확인해 주세요."
    if "html 문서가 아니어서" in lower_message:
        return "공고 페이지를 읽지 못했습니다. 접근이 제한된 페이지일 수 있습니다."
    return "공고 페이지를 불러오지 못했습니다. URL을 다시 확인해 주세요."


def _user_friendly_ocr_error(message: str) -> str:
    lower_message = message.lower()
    if "invalid image" in lower_message:
        return "이미지 파일 형식이 올바르지 않습니다. PNG, JPG, JPEG, WEBP 파일만 업로드해 주세요."
    if "did not extract any text" in lower_message or "텍스트를 추출하지 못했습니다" in message:
        return "이미지에서 텍스트를 읽지 못했습니다. 공고 이미지가 선명한지 확인해 주세요."
    return "이미지 인식에 실패했습니다. 다른 공고 이미지로 다시 시도해 주세요."


@lru_cache
def get_model_services():
    services = build_model_stage_services()
    _debug(
        "model services ready "
        f"ocr={services.settings.ocr.provider} "
        f"embedding={services.settings.embedding.provider} "
        f"llm={services.settings.llm.provider}"
    )
    return services


@router.post("/analyze", response_model=JobPostAnalyzeResponse)
async def analyze_job_post(
    files: list[UploadFile] = File(default=[]),
    userId: str = Form(default=""),
    companyName: str = Form(default=""),
    targetPosition: str = Form(default=""),
    companyUrl: str = Form(default=""),
    company_url: str = Form(default=""),
    experienceText: str = Form(default=""),
    essayPrompt: str = Form(default=""),
    motivationText: str = Form(default=""),
):
    company_name = companyName.strip()
    user_id = (userId or "").strip() or "anonymous"
    target_position = targetPosition.strip()
    company_url_value = (companyUrl or company_url).strip()
    experience_text = experienceText.strip()
    essay_prompt = (essayPrompt or motivationText).strip()

    _debug(
        "request start "
        f"file_count={len(files)} "
        f"user_id={user_id!r} "
        f"company_name={company_name!r} "
        f"target_position={target_position!r} "
        f"company_url={company_url_value!r} "
        f"experience_len={len(experience_text)} "
        f"essay_prompt_len={len(essay_prompt)}"
    )

    model_services = get_model_services()
    ocr_test_mode = getattr(model_services.settings.ocr.api, "test_mode", False)

    _validate_request_fields(
        company_name=company_name,
        target_position=target_position,
        company_url=company_url_value,
        experience_text=experience_text,
        essay_prompt=essay_prompt,
        files=files,
        ocr_test_mode=ocr_test_mode,
    )

    try:
        return await analysis_service.analyze(
            files=files,
            user_id=user_id,
            company_name=company_name,
            target_position=target_position,
            company_url=company_url_value,
            experience_text=experience_text,
            essay_prompt=essay_prompt,
            ocr_test_mode=ocr_test_mode,
            model_services=model_services,
            debug=_debug,
        )
    except InvalidImageError as exc:
        _debug(f"InvalidImageError: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일 형식이 올바르지 않습니다. PNG, JPG, JPEG, WEBP 파일만 업로드해 주세요.",
        ) from exc
    except OCRProviderUnavailableError as exc:
        _debug(f"OCRProviderUnavailableError: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="이미지 인식 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc
    except OCRExecutionError as exc:
        _debug(f"OCRExecutionError: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=_user_friendly_ocr_error(str(exc)),
        ) from exc
    except CompanyCrawlError as exc:
        _debug(f"CompanyCrawlError: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=_user_friendly_crawl_error(str(exc)),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        _debug(f"unexpected server error: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc


@router.get("/recent", response_model=list[JobPostRecentAnalysisItem])
async def get_recent_job_post_analyses(
    userId: str = Query(default=""),
    limit: int = Query(default=3, ge=1, le=10),
):
    user_id = (userId or "").strip() or "anonymous"
    _debug(f"recent request start user_id={user_id!r} limit={limit}")

    with open_transaction() as conn:
        return fetch_recent_analysis_results(
            conn,
            user_id=user_id,
            limit=limit,
        )


def _validate_request_fields(
    *,
    company_name: str,
    target_position: str,
    company_url: str,
    experience_text: str,
    essay_prompt: str,
    files: list[UploadFile],
    ocr_test_mode: bool,
) -> None:
    if not company_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="회사명을 입력해 주세요.",
        )
    if not target_position:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지원 직무를 입력해 주세요.",
        )
    if not company_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="공고 URL을 입력해 주세요.",
        )
    if not _is_valid_url(company_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="공고 URL 형식이 올바르지 않습니다. https:// 로 시작하는 주소를 입력해 주세요.",
        )
    if not experience_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="경험 내용을 입력해 주세요.",
        )
    if len(essay_prompt) > MAX_ESSAY_PROMPT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자소서 문항은 300자 이하여야 합니다.",
        )
    if not ocr_test_mode and not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="공고 이미지를 첨부해 주세요.",
        )


def _is_valid_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
