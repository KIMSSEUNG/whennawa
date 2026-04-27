import os
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


# 서버 시작 전에 backend_python/.env를 먼저 읽는다.
load_environment()


def _parse_csv_env(name: str, fallback: list[str]) -> list[str]:
    raw = os.getenv(name, "")
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values or fallback


APP_HOST = os.getenv("APP_HOST", "127.0.0.1").strip() or "127.0.0.1"
APP_PORT = int(os.getenv("APP_PORT", "8000"))
APP_ROOT_PATH = os.getenv("APP_ROOT_PATH", "").strip()
APP_RELOAD = os.getenv("APP_RELOAD", "false").strip().lower() in {"1", "true", "yes", "on"}
APP_CORS_ALLOWED_ORIGINS = _parse_csv_env(
    "APP_CORS_ALLOWED_ORIGINS",
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)

app = FastAPI(
    title="Job Post OCR Analyzer",
    version="0.1.0",
    description="Upload a job posting image and extract structured fields with OCR.",
    root_path=APP_ROOT_PATH,
)


@app.on_event("startup")
def run_database_migrations() -> None:
    apply_pending_migrations()


app.add_middleware(
    CORSMiddleware,
    allow_origins=APP_CORS_ALLOWED_ORIGINS,
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
    uvicorn.run("main:app", host=APP_HOST, port=APP_PORT, reload=APP_RELOAD)
