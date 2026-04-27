from pathlib import Path
import sys
import traceback

from fastapi import APIRouter, Form, HTTPException, status

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from schemas.company_crawl_schema import CompanyCrawlResponse
    from services.company_crawl_service import CompanyCrawlError, CompanyCrawlService
except ModuleNotFoundError:
    from backend.schemas.company_crawl_schema import CompanyCrawlResponse
    from backend.services.company_crawl_service import (
        CompanyCrawlError,
        CompanyCrawlService,
    )


router = APIRouter(prefix="/api/company", tags=["company"])
company_crawl_service = CompanyCrawlService()


def _debug(message: str) -> None:
    print(f"[company_router] {message}", flush=True)


def _user_friendly_crawl_error(message: str) -> str:
    lower_message = message.lower()
    if "companyurl 형식" in lower_message or "invalid url" in lower_message:
        return "공고 URL 형식이 올바르지 않습니다. 주소를 다시 확인해 주세요."
    if "추출 가능한 페이지를 찾지 못했다" in message:
        return "공고 페이지를 불러오지 못했습니다. 해당 URL이 공고 페이지인지 확인해 주세요."
    if "html 문서가 아니어서" in lower_message:
        return "공고 페이지를 읽지 못했습니다. 접근이 제한된 페이지일 수 있습니다."
    return "공고 페이지를 불러오지 못했습니다. URL을 다시 확인해 주세요."


@router.post("/crawl", response_model=CompanyCrawlResponse)
async def crawl_company(companyUrl: str = Form(default="")):
    company_url = companyUrl.strip()
    if not company_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="공고 URL을 입력해 주세요.",
        )

    _debug(f"crawl start company_url={company_url!r}")

    try:
        result = await company_crawl_service.crawl(company_url)
        _debug(
            "crawl success "
            f"company_name={result.company_name!r} "
            f"headings={len(result.headings)} "
            f"links={len(result.links)} "
            f"raw_len={len(result.raw_text)}"
        )
        return CompanyCrawlResponse(
            companyUrl=result.company_url,
            finalUrl=result.final_url,
            companyName=result.company_name,
            title=result.title,
            description=result.description,
            headings=result.headings,
            links=result.links,
            rawText=result.raw_text,
            truncated=result.truncated,
        )
    except CompanyCrawlError as exc:
        _debug(f"CompanyCrawlError: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=_user_friendly_crawl_error(str(exc)),
        ) from exc
    except Exception as exc:
        _debug(f"unexpected crawl error: {exc}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="공고 페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc
