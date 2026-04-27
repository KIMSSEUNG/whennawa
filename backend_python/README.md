# Backend

## Environment
- `OPEN_API_KEY` as shared fallback key
- `OCR_PROVIDER=openapi`
- `EMBEDDING_PROVIDER=openapi`
- `LLM_PROVIDER=openapi`
- `PYTHONUTF8=1`
- `PYTHONIOENCODING=utf-8`

## OCR Test Mode
- Set `OCR_TEST=true` in `backend/.env`
- Set `OCR_TEST_TEXT` to the text you want to reuse as OCR output
- In this mode, uploaded images are not sent to the OCR provider

## Company Crawl API
- Company crawl is now called internally from `POST /api/job-post/analyze`
- The standalone `company_router.py` is kept only as a test/debug file and is not mounted in `main.py`
- The pipeline now builds `companyProfile` and `embeddingSourceText` inside the analysis response

## Main Files
- `core/model_settings.py`
- `services/model_stage_service.py`
- `services/ocr_service.py`
- `services/company_crawl_service.py`
- `routers/job_post_router.py`
- `routers/company_router.py`

## Database Migrations
- Set `DATABASE_URL` in `backend/.env`, or use `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- On app startup, `db/migrator.py` applies pending SQL migrations from `db/migrations/`
- This is the Python-side equivalent of Flyway-style schema versioning

## Database Layer
- `db/connection.py` provides PostgreSQL connection and transaction helpers
- `db/normalization.py` provides URL/name/hash normalization helpers
- `db/repository.py` provides company/source/experience/application/chunk persistence helpers

## Terminal Encoding
- `main.py` forces Python stdout/stderr to UTF-8 early in startup
- If the VSCode terminal still breaks Korean text, run PowerShell with UTF-8 code page: `chcp 65001`
