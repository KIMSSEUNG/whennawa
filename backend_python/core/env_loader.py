from functools import lru_cache
from pathlib import Path


@lru_cache
def load_environment() -> None:
    """backend/.env를 우선 로드하고, 없으면 상위 .env도 fallback으로 시도한다."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        print(
            "[env_loader] python-dotenv is not installed. "
            "Install it with `pip install python-dotenv` to use backend/.env.",
            flush=True,
        )
        return

    backend_dir = Path(__file__).resolve().parent.parent
    backend_env = backend_dir / ".env"
    root_env = backend_dir.parent / ".env"

    load_dotenv(backend_env, override=False)
    load_dotenv(root_env, override=False)
