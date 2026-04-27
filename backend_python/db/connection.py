from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from .config import build_database_url


class DatabaseConfigError(RuntimeError):
    pass


def get_database_url() -> str:
    database_url = build_database_url()
    if not database_url:
        raise DatabaseConfigError(
            "DATABASE_URL or POSTGRES_* environment variables are not configured."
        )
    return database_url


@contextmanager
def open_connection() -> Iterator[psycopg.Connection]:
    database_url = get_database_url()
    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        yield conn


@contextmanager
def open_transaction() -> Iterator[psycopg.Connection]:
    with open_connection() as conn:
        with conn.transaction():
            yield conn

