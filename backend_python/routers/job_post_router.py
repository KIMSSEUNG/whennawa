from pathlib import Path
import sys
from functools import lru_cache
import traceback
from urllib.parse import urlparse

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from schemas.job_post_schema import JobPostAnalyzeResponse
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
    from backend.schemas.job_post_schema import JobPostAnalyzeResponse
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
            detail=str(exc),
        ) from exc
    except OCRProviderUnavailableError as exc:
        _debug(f"OCRProviderUnavailableError: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except OCRExecutionError as exc:
        _debug(f"OCRExecutionError: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except CompanyCrawlError as exc:
        _debug(f"CompanyCrawlError: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        _debug(f"unexpected server error: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"서버 내부 오류가 발생했다: {exc}",
        ) from exc


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
            detail="companyName은 필수다.",
        )
    if not target_position:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="targetPosition은 필수다.",
        )
    if not company_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="companyUrl은 필수다.",
        )
    if not _is_valid_url(company_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="companyUrl 형식이 올바르지 않다.",
        )
    if not experience_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="experienceText는 필수다.",
        )
    if len(essay_prompt) > MAX_ESSAY_PROMPT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="essayPrompt는 300자 이하여야 한다.",
        )
    if not ocr_test_mode and not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="채용공고 이미지가 필요합니다.",
        )


def _is_valid_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
