import os
from dataclasses import dataclass, field

try:
    from core.env_loader import load_environment
except ModuleNotFoundError:
    from backend.core.env_loader import load_environment


load_environment()


def _get_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _get_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return float(raw.strip())
    except ValueError:
        return default


def _get_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def _get_api_key(name: str) -> str:
    return _get_env(name) or _get_env("OPEN_API_KEY")


def _get_url(name: str, default: str = "") -> str:
    return _get_env(name) or _get_env("OPEN_API_URL") or default


@dataclass(slots=True)
class OCRApiSettings:
    url: str = ""
    api_key: str = ""
    auth_header: str = "Authorization"
    auth_scheme: str = "Bearer"
    timeout_seconds: float = 60.0
    model_name: str = "gpt-4.1-mini"
    prompt_text: str = ""
    request_mode: str = "multipart"
    file_field: str = "file"
    json_image_field: str = "imageBase64"
    json_filename_field: str = "filename"
    json_mime_field: str = "mimeType"
    test_mode: bool = False
    test_text: str = ""


@dataclass(slots=True)
class OCRStageSettings:
    provider: str = "openapi"
    api: OCRApiSettings = field(default_factory=OCRApiSettings)


@dataclass(slots=True)
class EmbeddingStageSettings:
    provider: str = "openapi"
    model_name: str = ""
    api_url: str = ""
    api_key: str = ""
    auth_header: str = "Authorization"
    auth_scheme: str = "Bearer"
    timeout_seconds: float = 180.0


@dataclass(slots=True)
class LLMStageSettings:
    provider: str = "openapi"
    model_name: str = ""
    api_url: str = ""
    api_key: str = ""
    auth_header: str = "Authorization"
    auth_scheme: str = "Bearer"
    timeout_seconds: float = 180.0


@dataclass(slots=True)
class ModelStageSettings:
    ocr: OCRStageSettings
    embedding: EmbeddingStageSettings
    llm: LLMStageSettings


def load_model_settings() -> ModelStageSettings:
    return ModelStageSettings(
        ocr=OCRStageSettings(
            provider=_get_env("OCR_PROVIDER", "openapi").lower(),
            api=OCRApiSettings(
                url=_get_url("OCR_API_URL", "https://api.openai.com/v1/responses"),
                api_key=_get_api_key("OCR_API_KEY"),
                auth_header=_get_env(
                    "OCR_API_AUTH_HEADER",
                    _get_env("OPEN_API_AUTH_HEADER", "Authorization"),
                ),
                auth_scheme=_get_env(
                    "OCR_API_AUTH_SCHEME",
                    _get_env("OPEN_API_AUTH_SCHEME", "Bearer"),
                ),
                timeout_seconds=_get_float("OCR_API_TIMEOUT_SECONDS", 60.0),
                model_name=_get_env("OCR_API_MODEL", "gpt-4.1-mini"),
                prompt_text=_get_env(
                    "OCR_API_PROMPT",
                    (
                        "You are an OCR extractor for Korean job posting documents.\n"
                        "Extract all visible text as plain text.\n"
                        "Do not classify sections, infer meaning, summarize, or rewrite content.\n"
                        "Keep line breaks when they help preserve reading order.\n"
                        "Ignore decorative elements, icons, banners, and repeated UI fragments.\n"
                        "Return plain text only."
                    ),
                ),
                request_mode=_get_env("OCR_API_REQUEST_MODE", "multipart").lower(),
                file_field=_get_env("OCR_API_FILE_FIELD", "file"),
                json_image_field=_get_env("OCR_API_JSON_IMAGE_FIELD", "imageBase64"),
                json_filename_field=_get_env("OCR_API_JSON_FILENAME_FIELD", "filename"),
                json_mime_field=_get_env("OCR_API_JSON_MIME_FIELD", "mimeType"),
                test_mode=_get_bool("OCR_TEST", False),
                test_text=_get_env(
                    "OCR_TEST_TEXT",
                    (
                        "모집부문 자격요건 및 우대사항\n"
                        "SW개발 (JAVA/Python) 웹 애플리케이션 개발\n"
                        "응용 프로그램 개발 및 유지보수\n"
                        "서비스 운영 및 개선\n"
                        "데이터베이스 활용\n"
                        "신입, 또는 3년 이하 경력자\n"
                        "프로그래밍 언어에 능숙한 자\n"
                        "JavaScript, HTML/CSS 이해\n"
                        "SQL Query/성능개선에 대한 이해\n"
                        "지속적인 성장을 추구하는 개발자\n"
                        "원활한 커뮤니케이션 능력\n"
                        "[공통 적용 사항]\n"
                        "대졸(4년)이상 면접 후 직급 및 연봉 협의\n"
                        "정보처리기사, 정보통신기사 등 보유자 우대\n"
                        "컴퓨터/시스템 공학 등 관련 학과 출신 우대"
                    ),
                ),
            ),
        ),
        embedding=EmbeddingStageSettings(
            provider=_get_env("EMBEDDING_PROVIDER", "openapi").lower(),
            model_name=_get_env(
                "EMBEDDING_MODEL",
                _get_env("OPEN_API_EMBEDDING_MODEL"),
            ),
            api_url=_get_url("EMBEDDING_API_URL"),
            api_key=_get_api_key("EMBEDDING_API_KEY"),
            auth_header=_get_env(
                "EMBEDDING_API_AUTH_HEADER",
                _get_env("OPEN_API_AUTH_HEADER", "Authorization"),
            ),
            auth_scheme=_get_env(
                "EMBEDDING_API_AUTH_SCHEME",
                _get_env("OPEN_API_AUTH_SCHEME", "Bearer"),
            ),
            timeout_seconds=_get_float("EMBEDDING_API_TIMEOUT_SECONDS", 60.0),
        ),
        llm=LLMStageSettings(
            provider=_get_env("LLM_PROVIDER", "openapi").lower(),
            model_name=_get_env("LLM_MODEL", _get_env("OPEN_API_LLM_MODEL")),
            api_url=_get_url("LLM_API_URL"),
            api_key=_get_api_key("LLM_API_KEY"),
            auth_header=_get_env(
                "LLM_API_AUTH_HEADER",
                _get_env("OPEN_API_AUTH_HEADER", "Authorization"),
            ),
            auth_scheme=_get_env(
                "LLM_API_AUTH_SCHEME",
                _get_env("OPEN_API_AUTH_SCHEME", "Bearer"),
            ),
            timeout_seconds=_get_float("LLM_API_TIMEOUT_SECONDS", 60.0),
        ),
    )
