from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from utils.text_utils import _split_line_into_sentences

try:
    # Windows PowerShell/VSCode 터미널에서 한글 로그가 깨지는 문제를 줄이기 위해
    # Python 표준 출력/에러 출력을 UTF-8로 고정한다.
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    # Python 버전이나 실행 환경에 따라 reconfigure가 없을 수 있으므로 무시한다.
    pass

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.env_loader import load_environment
from db.migrator import apply_pending_migrations
from routers.job_post_router import router as job_post_router
from routers.company_router import router as company_router


# 서버 시작 전에 backend/.env를 먼저 읽는다.
load_environment()

app = FastAPI(
    title="Job Post OCR Analyzer",
    version="0.1.0",
    description="Upload a job posting image and extract structured fields with OCR.",
)


@app.on_event("startup")
def run_database_migrations() -> None:
    apply_pending_migrations()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(job_post_router)
app.include_router(company_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
