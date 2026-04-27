from __future__ import annotations

import os
from urllib.parse import quote_plus

from core.env_loader import load_environment


load_environment()


def _get_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def build_database_url() -> str | None:
    database_url = _get_env("DATABASE_URL") or _get_env("DB_URL")
    if database_url:
        return database_url

    host = _get_env("POSTGRES_HOST")
    db_name = _get_env("POSTGRES_DB")
    user = _get_env("POSTGRES_USER")
    password = _get_env("POSTGRES_PASSWORD")
    port = _get_env("POSTGRES_PORT", "5432")
    sslmode = _get_env("POSTGRES_SSLMODE")

    if not (host and db_name and user):
        return None

    auth = quote_plus(user)
    if password:
        auth = f"{auth}:{quote_plus(password)}"

    url = f"postgresql://{auth}@{host}:{port}/{db_name}"
    if sslmode:
        url = f"{url}?sslmode={quote_plus(sslmode)}"
    return url

