from __future__ import annotations

import hashlib
import re
from pathlib import Path

import psycopg
import sqlparse

from core.env_loader import load_environment
from db.config import build_database_url


MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
MIGRATION_LOCK_ID = 7_414_001_221
MIGRATION_TABLE = "schema_migrations"


class MigrationError(RuntimeError):
    pass


def get_database_url() -> str | None:
    return build_database_url()


def _ensure_migration_table(conn: psycopg.Connection) -> None:
    conn.execute(
        f"""
        create table if not exists {MIGRATION_TABLE} (
          version text primary key,
          filename text not null unique,
          checksum text not null,
          applied_at timestamptz not null default now()
        )
        """
    )
    print(f"[migrator] ensured table {MIGRATION_TABLE}", flush=True)


def _load_migration_files() -> list[Path]:
    if not MIGRATIONS_DIR.exists():
        return []
    return sorted(
        [path for path in MIGRATIONS_DIR.iterdir() if path.is_file() and path.suffix == ".sql"],
        key=lambda path: path.name,
    )


def _split_sql(sql_text: str) -> list[str]:
    return [statement.strip() for statement in sqlparse.split(sql_text) if statement.strip()]


def _statement_label(statement: str) -> str:
    normalized = " ".join(statement.strip().split())
    lowered = normalized.lower()

    patterns = [
        (r"^create table if not exists\s+([^\s(]+)", "table"),
        (r"^create table\s+([^\s(]+)", "table"),
        (r"^create unique index if not exists\s+([^\s(]+)", "unique index"),
        (r"^create index if not exists\s+([^\s(]+)", "index"),
        (r"^create unique index\s+([^\s(]+)", "unique index"),
        (r"^create index\s+([^\s(]+)", "index"),
        (r"^create trigger\s+([^\s(]+)", "trigger"),
        (r"^drop trigger if exists\s+([^\s(]+)", "drop trigger"),
        (r"^create or replace function\s+([^\s(]+)", "function"),
        (r"^create extension if not exists\s+([^\s(]+)", "extension"),
    ]

    for pattern, kind in patterns:
        match = re.match(pattern, lowered)
        if match:
            return f"{kind} {match.group(1)}"

    return normalized[:120]


def _apply_migration(conn: psycopg.Connection, migration_path: Path) -> None:
    sql_text = migration_path.read_text(encoding="utf-8")
    checksum = hashlib.sha256(sql_text.encode("utf-8")).hexdigest()

    existing = conn.execute(
        f"select checksum from {MIGRATION_TABLE} where filename = %s",
        (migration_path.name,),
    ).fetchone()
    if existing:
        if existing[0] != checksum:
            print(
                f"[migrator] migration changed after apply, will re-run: {migration_path.name}",
                flush=True,
            )
            conn.execute(
                f"delete from {MIGRATION_TABLE} where filename = %s",
                (migration_path.name,),
            )
        else:
            print(f"[migrator] skipped {migration_path.name} (already applied)", flush=True)
            return

    statements = _split_sql(sql_text)
    if not statements:
        raise MigrationError(f"Migration file is empty: {migration_path.name}")

    print(
        f"[migrator] applying {migration_path.name} ({len(statements)} statements)",
        flush=True,
    )
    with conn.transaction():
        for index, statement in enumerate(statements, start=1):
            label = _statement_label(statement)
            try:
                print(f"[migrator]   -> {label}", flush=True)
                conn.execute(statement)
            except Exception as exc:
                print(
                    f"[migrator]   !! failed at statement {index} in {migration_path.name}: {label}",
                    flush=True,
                )
                print(f"[migrator]   !! error: {exc}", flush=True)
                raise MigrationError(
                    f"Failed to apply {migration_path.name} at statement {index}: {label}"
                ) from exc
        conn.execute(
            f"""
            insert into {MIGRATION_TABLE} (version, filename, checksum)
            values (%s, %s, %s)
            """,
            (migration_path.stem, migration_path.name, checksum),
        )
    print(f"[migrator] applied {migration_path.name}", flush=True)


def apply_pending_migrations() -> bool:
    load_environment()
    database_url = get_database_url()
    if not database_url:
        print(
            "[migrator] PostgreSQL settings are not set. "
            "Set DATABASE_URL or POSTGRES_* in backend/.env.",
            flush=True,
        )
        return False

    if not MIGRATIONS_DIR.exists():
        print(f"[migrator] Migration directory not found: {MIGRATIONS_DIR}", flush=True)
        return False

    with psycopg.connect(database_url) as conn:
        with conn.transaction():
            conn.execute("select pg_advisory_lock(%s)", (MIGRATION_LOCK_ID,))
            _ensure_migration_table(conn)

        migrations = _load_migration_files()
        for migration_path in migrations:
            try:
                _apply_migration(conn, migration_path)
            except Exception:
                print(f"[migrator] migration failed: {migration_path.name}", flush=True)
                raise

    return True
