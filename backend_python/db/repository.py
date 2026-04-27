from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable
from urllib.parse import urlparse

import psycopg
from psycopg.types.json import Jsonb

from .chunking import split_text_into_chunks
from .normalization import (
    make_content_hash,
    make_chunk_hash,
    normalize_company_name,
    normalize_url,
)


EMBEDDING_DIMENSION = 1536
DebugFn = Callable[[str], None]


@dataclass(slots=True)
class ChunkInsertResult:
    chunk_count: int
    reused_count: int = 0
    source_id: int | None = None


@dataclass(slots=True)
class RagChunkSearchResult:
    # 벡터 검색 결과 1건을 담는다.
    id: int
    source_type: str
    source_table: str
    source_id: int
    chunk_index: int
    chunk_text: str
    metadata: dict[str, Any]
    distance: float
    score: float


def save_analysis_result(
    conn: psycopg.Connection,
    *,
    user_id: str,
    company_id: int | None = None,
    application_id: int | None = None,
    experience_id: int | None = None,
    company_name: str | None = None,
    target_position: str | None = None,
    essay_prompt: str,
    essay_emotion_text: str | None = None,
    essay_formal_text: str | None = None,
) -> dict[str, Any]:
    row = conn.execute(
        """
        insert into analysis_results (
          user_id,
          company_id,
          application_id,
          experience_id,
          company_name,
          target_position,
          essay_prompt,
          essay_emotion_text,
          essay_formal_text
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        returning *
        """,
        (
            _normalize_user_id(user_id),
            company_id,
            application_id,
            experience_id,
            company_name,
            target_position,
            essay_prompt.strip(),
            essay_emotion_text,
            essay_formal_text,
        ),
    ).fetchone()
    return dict(row)


def fetch_recent_analysis_results(
    conn: psycopg.Connection,
    *,
    user_id: str,
    limit: int = 3,
) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select *
        from analysis_results
        where user_id = %s
        order by created_at desc, id desc
        limit %s
        """,
        (
            _normalize_user_id(user_id),
            max(1, limit),
        ),
    ).fetchall()
    results: list[dict[str, Any]] = []
    for row in rows:
        created_at = row["created_at"]
        results.append(
            {
                "id": row["id"],
                "companyName": (row["company_name"] or ""),
                "targetPosition": (row["target_position"] or ""),
                "essayEmotionText": (row["essay_emotion_text"] or ""),
                "essayFormalText": (row["essay_formal_text"] or ""),
                "createdAt": created_at.isoformat() if created_at else "",
            }
        )
    return results


def upsert_company(
    conn: psycopg.Connection,
    *,
    company_name: str,
    company_url: str | None = None,
) -> dict[str, Any]:
    normalized_name = normalize_company_name(company_name)
    normalized_company_url = normalize_url(company_url or "")
    url_hash = _sha256_or_none(normalized_company_url)
    domain = _extract_domain(normalized_company_url)

    row = None
    if url_hash:
        row = conn.execute(
            """
            select *
            from companies
            where url_hash = %s
            limit 1
            """,
            (url_hash,),
        ).fetchone()

    if row is None and normalized_company_url:
        row = conn.execute(
            """
            select *
            from companies
            where normalized_url = %s
            limit 1
            """,
            (normalized_company_url,),
        ).fetchone()

    if row is None and normalized_name:
        row = conn.execute(
            """
            select *
            from companies
            where normalized_company_name = %s
            order by id desc
            limit 1
            """,
            (normalized_name,),
        ).fetchone()

    if row is None:
        row = conn.execute(
            """
            insert into companies (
              company_name,
              normalized_company_name,
              company_url,
              normalized_url,
              company_domain,
              url_hash
            )
            values (%s, %s, %s, %s, %s, %s)
            returning *
            """,
            (
                company_name.strip(),
                normalized_name,
                company_url.strip() if company_url else None,
                normalized_company_url or None,
                domain or None,
                url_hash,
            ),
        ).fetchone()
        return dict(row)

    updated = conn.execute(
        """
        update companies
        set company_name = %s,
            normalized_company_name = %s,
            company_url = coalesce(%s, company_url),
            normalized_url = coalesce(%s, normalized_url),
            company_domain = coalesce(%s, company_domain),
            url_hash = coalesce(%s, url_hash)
        where id = %s
        returning *
        """,
        (
            company_name.strip(),
            normalized_name,
            company_url.strip() if company_url else None,
            normalized_company_url or None,
            domain or None,
            url_hash,
            row["id"],
        ),
    ).fetchone()
    return dict(updated)


def upsert_crawl_source(
    conn: psycopg.Connection,
    *,
    company_id: int | None,
    source_type: str,
    original_url: str,
    etag: str | None = None,
    last_modified: str | None = None,
    content_hash: str | None = None,
    http_status: int | None = None,
    crawl_status: str = "pending",
    fetched_at=None,
    next_fetch_at=None,
) -> dict[str, Any]:
    normalized = normalize_url(original_url)
    url_hash = _sha256_or_none(normalized)

    row = conn.execute(
        """
        insert into crawl_sources (
          company_id,
          source_type,
          original_url,
          normalized_url,
          url_hash,
          etag,
          last_modified,
          content_hash,
          http_status,
          crawl_status,
          fetched_at,
          next_fetch_at
        )
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        on conflict (url_hash) do update set
          company_id = excluded.company_id,
          source_type = excluded.source_type,
          original_url = excluded.original_url,
          normalized_url = excluded.normalized_url,
          etag = coalesce(excluded.etag, crawl_sources.etag),
          last_modified = coalesce(excluded.last_modified, crawl_sources.last_modified),
          content_hash = coalesce(excluded.content_hash, crawl_sources.content_hash),
          http_status = coalesce(excluded.http_status, crawl_sources.http_status),
          crawl_status = excluded.crawl_status,
          fetched_at = coalesce(excluded.fetched_at, crawl_sources.fetched_at),
          next_fetch_at = coalesce(excluded.next_fetch_at, crawl_sources.next_fetch_at)
        returning *
        """,
        (
            company_id,
            source_type,
            original_url.strip(),
            normalized,
            url_hash,
            etag,
            last_modified,
            content_hash,
            http_status,
            crawl_status,
            fetched_at,
            next_fetch_at,
        ),
    ).fetchone()
    return dict(row)


def should_crawl_source(
    conn: psycopg.Connection,
    *,
    original_url: str,
) -> tuple[bool, dict[str, Any] | None]:
    normalized = normalize_url(original_url)
    url_hash = _sha256_or_none(normalized)
    if not url_hash:
        return True, None

    row = conn.execute(
        """
        select *
        from crawl_sources
        where url_hash = %s
        limit 1
        """,
        (url_hash,),
    ).fetchone()
    if row is None:
        return True, None

    next_fetch_at = row.get("next_fetch_at")
    if next_fetch_at is None:
        return True, dict(row)

    now_row = conn.execute("select now() as now").fetchone()
    now_value = now_row["now"]
    return bool(next_fetch_at <= now_value), dict(row)

# 크롤링 스냅샷 버전 Upsert(원본 파일)
def insert_crawl_snapshot(
    conn: psycopg.Connection,
    *,
    crawl_source_id: int,
    content_hash: str,
    raw_html: str | None,
    extracted_text: str | None,
) -> dict[str, Any]:
    # 같은 URL, 같은 내용이면 snapshot을 새로 만들지 않고 기존 row를 재사용한다.
    # 내용이 바뀐 경우에만 새 버전이 들어가도록 upsert 형태로 처리한다.
    conn.execute(
        """
        update crawl_snapshots
        set is_latest = false
        where crawl_source_id = %s and is_latest = true
        """,
        (crawl_source_id,),
    )

    upserted = conn.execute(
        """
        insert into crawl_snapshots (
          crawl_source_id,
          content_hash,
          raw_html,
          extracted_text,
          fetched_at,
          is_latest
        )
        values (%s, %s, %s, %s, now(), true)
        on conflict (crawl_source_id, content_hash) do update set
          raw_html = excluded.raw_html,
          extracted_text = excluded.extracted_text,
          fetched_at = now(),
          is_latest = true
        returning *
        """,
        (crawl_source_id, content_hash, raw_html, extracted_text),
    ).fetchone()
    return dict(upserted)


def _delete_rag_chunks(
    conn: psycopg.Connection,
    *,
    source_table: str,
    source_id: int,
) -> int:
    # 같은 원본의 chunk를 다시 만들기 전에 기존 chunk를 지운다.
    # 그래야 unique(source_table, source_id, chunk_index) 충돌이 나지 않는다.
    deleted = conn.execute(
        """
        delete from rag_chunks
        where source_table = %s
          and source_id = %s
        """,
        (source_table, source_id),
    )
    return deleted.rowcount or 0


def _fetch_existing_chunk_embeddings(
    conn: psycopg.Connection,
    *,
    user_id: str,
    source_table: str,
    source_id: int,
) -> dict[str, str]:
    rows = conn.execute(
        """
        select chunk_hash, embedding::text as embedding_literal
        from rag_chunks
        where user_id = %s
          and source_table = %s
          and source_id = %s
        """,
        (_normalize_user_id(user_id), source_table, source_id),
    ).fetchall()
    return {
        row["chunk_hash"]: row["embedding_literal"]
        for row in rows
        if row["chunk_hash"] and row["embedding_literal"]
    }


def search_rag_chunks(
    conn: psycopg.Connection,
    *,
    query_text: str,
    embedding_service,
    top_k: int = 5,
    user_id: str | None = None,
    source_types: list[str] | None = None,
    source_tables: list[str] | None = None,
    source_ids: list[int] | None = None,
    debug: DebugFn | None = None,
) -> list[RagChunkSearchResult]:
    # 검색어를 임베딩한 뒤 cosine distance 기준으로 가장 가까운 chunk를 찾는다.
    query_embedding = embedding_service.embed(query_text)
    if len(query_embedding.values) != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Embedding dimension mismatch: expected {EMBEDDING_DIMENSION}, "
            f"got {len(query_embedding.values)}"
        )

    clauses: list[str] = []
    params: list[Any] = []

    if user_id:
        clauses.append("user_id = any(%s)")
        params.append([_normalize_user_id(user_id), "public"])

    if source_types:
        clauses.append("source_type = any(%s)")
        params.append(source_types)

    if source_tables:
        clauses.append("source_table = any(%s)")
        params.append(source_tables)

    if source_ids:
        clauses.append("source_id = any(%s)")
        params.append(source_ids)

    where_sql = f"where {' and '.join(clauses)}" if clauses else ""
    sql = f"""
        select
          id,
          source_type,
          source_table,
          source_id,
          chunk_index,
          chunk_text,
          metadata,
          (embedding <=> %s::vector) as distance
        from rag_chunks
        {where_sql}
        order by embedding <=> %s::vector
        limit %s
    """

    vector_literal = _vector_literal(query_embedding.values)
    final_params = [vector_literal, *params, vector_literal, top_k]
    rows = conn.execute(sql, final_params).fetchall()

    results: list[RagChunkSearchResult] = []
    for row in rows:
        distance = float(row["distance"] or 0.0)
        score = max(0.0, 1.0 - distance)
        results.append(
            RagChunkSearchResult(
                id=row["id"],
                source_type=row["source_type"],
                source_table=row["source_table"],
                source_id=row["source_id"],
                chunk_index=row["chunk_index"],
                chunk_text=row["chunk_text"],
                metadata=dict(row["metadata"] or {}),
                distance=distance,
                score=score,
            )
        )

    if debug:
        debug(
            "rag search done "
            f"query_len={len(query_text)} top_k={top_k} "
            f"filters=types:{source_types or []},tables:{source_tables or []},ids:{source_ids or []} "
            f"result_count={len(results)}"
        )

    return results


def save_crawl_snapshot_and_refresh_chunks(
    conn: psycopg.Connection,
    *,
    user_id: str = "public",
    crawl_source_id: int,
    source_type: str,
    source_text: str,
    embedding_service,
    raw_html: str | None = None,
    metadata: dict[str, Any] | None = None,
    debug: DebugFn | None = None,
    store_chunks: bool = False,
) -> ChunkInsertResult:
    metadata = metadata or {}
    normalized_user_id = _normalize_user_id(user_id)
    content_hash = make_content_hash(source_text)

    current_source_row = conn.execute(
        """
        select content_hash
        from crawl_sources
        where id = %s
        limit 1
        """,
        (crawl_source_id,),
    ).fetchone()

    latest_snapshot_row = conn.execute(
        """
        select id
        from crawl_snapshots
        where crawl_source_id = %s
          and is_latest = true
        order by id desc
        limit 1
        """,
        (crawl_source_id,),
    ).fetchone()

    previous_snapshot_id = latest_snapshot_row["id"] if latest_snapshot_row else None
    existing_chunk_embeddings: dict[str, str] = {}
    if previous_snapshot_id is not None:
        existing_chunk_embeddings = _fetch_existing_chunk_embeddings(
            conn,
            user_id=normalized_user_id,
            source_table="crawl_snapshots",
            source_id=previous_snapshot_id,
        )
    if debug:
        debug(
            "crawl cache check "
            f"crawl_source_id={crawl_source_id} previous_snapshot_id={previous_snapshot_id} "
            f"existing_chunk_count={len(existing_chunk_embeddings)} "
            f"current_hash={content_hash}"
        )

    if current_source_row and current_source_row["content_hash"] == content_hash:
        if debug:
            debug(
                "crawl cache hit "
                f"crawl_source_id={crawl_source_id} content_hash={content_hash} "
                "reason='same_content_hash'"
            )
        conn.execute(
            """
            update crawl_sources
            set fetched_at = now(),
                crawl_status = 'not_modified'
            where id = %s
            """,
            (crawl_source_id,),
        )
        return ChunkInsertResult(
            chunk_count=0,
            reused_count=0,
            source_id=previous_snapshot_id,
        )

    with conn.transaction():
        snapshot = insert_crawl_snapshot(
            conn,
            crawl_source_id=crawl_source_id,
            content_hash=content_hash,
            raw_html=raw_html,
            extracted_text=source_text,
        )
        if debug:
            debug(
                "crawl cache miss "
                f"crawl_source_id={crawl_source_id} new_snapshot_id={snapshot['id']} "
                f"previous_snapshot_id={previous_snapshot_id}"
            )
        conn.execute(
            """
            update crawl_sources
            set content_hash = %s,
                fetched_at = now(),
                crawl_status = 'fetched'
            where id = %s
            """,
            (content_hash, crawl_source_id),
        )

        chunk_result = ChunkInsertResult(chunk_count=0, reused_count=0)
        if store_chunks:
            chunk_result = _insert_chunks(
                conn,
                user_id=normalized_user_id,
                source_type=source_type,
                source_table="crawl_snapshots",
                source_id=snapshot["id"],
                source_text=source_text,
                embedding_service=embedding_service,
                metadata=metadata,
                debug=debug,
                store_chunks=True,
                existing_embeddings_by_hash=existing_chunk_embeddings,
            )
            if previous_snapshot_id is not None:
                _delete_rag_chunks(
                    conn,
                    source_table="crawl_snapshots",
                    source_id=previous_snapshot_id,
                )
        return ChunkInsertResult(
            chunk_count=chunk_result.chunk_count,
            reused_count=chunk_result.reused_count,
            source_id=snapshot["id"],
        )


def upsert_experience_and_refresh_chunks(
    conn: psycopg.Connection,
    *,
    user_id: str = "anonymous",
    title: str | None,
    raw_text: str,
    embedding_service,
    metadata: dict[str, Any] | None = None,
    debug: DebugFn | None = None,
    store_chunks: bool = False,
) -> dict[str, Any]:
    metadata = metadata or {}
    normalized_user_id = _normalize_user_id(user_id)
    content_hash = make_content_hash(f"{title or ''}\n{raw_text}")

    with conn.transaction():
        row = conn.execute(
            """
            select *
            from experience_entries
            where user_id = %s
            order by id desc
            limit 1
            """,
            (normalized_user_id,),
        ).fetchone()
        if debug:
            debug(
                "experience cache check "
                f"user_id={normalized_user_id!r} row_found={row is not None} "
                f"current_hash={content_hash}"
            )

        if row and row["content_hash"] == content_hash:
            if debug:
                debug(
                    "experience cache hit "
                    f"user_id={normalized_user_id!r} content_hash={content_hash} "
                    "reason='same_content_hash'"
                )
            return dict(row)

        existing_chunk_embeddings: dict[str, str] = {}
        if row:
            existing_chunk_embeddings = _fetch_existing_chunk_embeddings(
                conn,
                user_id=normalized_user_id,
                source_table="experience_entries",
                source_id=row["id"],
            )
        if debug:
            debug(
                "experience cache miss "
                f"user_id={normalized_user_id!r} existing_chunk_count={len(existing_chunk_embeddings)}"
            )

        if row:
            updated = conn.execute(
                """
                update experience_entries
                set title = %s,
                    raw_text = %s,
                    content_hash = %s,
                    metadata = %s
                where id = %s
                returning *
                """,
                (title, raw_text, content_hash, _jsonb(metadata), row["id"]),
            ).fetchone()
            entry = dict(updated)
        else:
            inserted = conn.execute(
                """
                insert into experience_entries (
                  user_id,
                  title,
                  raw_text,
                  content_hash,
                  metadata
                )
                values (%s, %s, %s, %s, %s)
                returning *
                """,
                (normalized_user_id, title, raw_text, content_hash, _jsonb(metadata)),
            ).fetchone()
            entry = dict(inserted)

        if store_chunks:
            _delete_rag_chunks(
                conn,
                source_table="experience_entries",
                source_id=entry["id"],
            )
        _insert_chunks(
            conn,
            user_id=normalized_user_id,
            source_type="experience",
            source_table="experience_entries",
            source_id=entry["id"],
            source_text=raw_text,
            embedding_service=embedding_service,
            metadata=metadata,
            debug=debug,
            store_chunks=store_chunks,
            existing_embeddings_by_hash=existing_chunk_embeddings,
        )
        return entry


def upsert_application_and_refresh_chunks(
    conn: psycopg.Connection,
    *,
    user_id: str = "anonymous",
    company_id: int | None,
    target_position: str | None,
    company_url: str | None,
    job_post_url: str | None,
    raw_text: str,
    embedding_service,
    metadata: dict[str, Any] | None = None,
    debug: DebugFn | None = None,
    store_chunks: bool = False,
) -> dict[str, Any]:
    metadata = metadata or {}
    normalized_user_id = _normalize_user_id(user_id)
    content_hash = make_content_hash(
        "\n".join(
            part
            for part in [target_position or "", company_url or "", job_post_url or "", raw_text]
            if part
        )
    )

    with conn.transaction():
        row = conn.execute(
            """
            select *
            from application_entries
            where user_id = %s
              and coalesce(company_id, 0) = coalesce(%s, 0)
              and coalesce(target_position, '') = coalesce(%s, '')
              and coalesce(job_post_url, '') = coalesce(%s, '')
            order by id desc
            limit 1
            """,
            (normalized_user_id, company_id, target_position, job_post_url),
        ).fetchone()
        if debug:
            debug(
                "application cache check "
                f"user_id={normalized_user_id!r} row_found={row is not None} "
                f"current_hash={content_hash}"
            )

        if row and row["content_hash"] == content_hash:
            if debug:
                debug(
                    "application cache hit "
                    f"user_id={normalized_user_id!r} content_hash={content_hash} "
                    "reason='same_content_hash'"
                )
            return dict(row)

        existing_chunk_embeddings: dict[str, str] = {}
        if row:
            existing_chunk_embeddings = _fetch_existing_chunk_embeddings(
                conn,
                user_id=normalized_user_id,
                source_table="application_entries",
                source_id=row["id"],
            )
        if debug:
            debug(
                "application cache miss "
                f"user_id={normalized_user_id!r} existing_chunk_count={len(existing_chunk_embeddings)}"
            )

        if row:
            updated = conn.execute(
                """
                update application_entries
                set user_id = %s,
                    company_id = %s,
                    target_position = %s,
                    company_url = %s,
                    job_post_url = %s,
                    raw_text = %s,
                    content_hash = %s,
                    metadata = %s
                where id = %s
                returning *
                """,
                (
                    normalized_user_id,
                    company_id,
                    target_position,
                    company_url,
                    job_post_url,
                    raw_text,
                    content_hash,
                    _jsonb(metadata),
                    row["id"],
                ),
            ).fetchone()
            entry = dict(updated)
        else:
            inserted = conn.execute(
                """
                insert into application_entries (
                  user_id,
                  company_id,
                  target_position,
                  company_url,
                  job_post_url,
                  raw_text,
                  content_hash,
                  metadata
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                returning *
                """,
                (
                    normalized_user_id,
                    company_id,
                    target_position,
                    company_url,
                    job_post_url,
                    raw_text,
                    content_hash,
                    _jsonb(metadata),
                ),
            ).fetchone()
            entry = dict(inserted)

        if store_chunks:
            _delete_rag_chunks(
                conn,
                source_table="application_entries",
                source_id=entry["id"],
            )
        _insert_chunks(
            conn,
            user_id=normalized_user_id,
            source_type="job_post",
            source_table="application_entries",
            source_id=entry["id"],
            source_text=raw_text,
            embedding_service=embedding_service,
            metadata=metadata,
            debug=debug,
            store_chunks=store_chunks,
            existing_embeddings_by_hash=existing_chunk_embeddings,
        )
        return entry


def _insert_chunks(
    conn: psycopg.Connection,
    *,
    user_id: str,
    source_type: str,
    source_table: str,
    source_id: int,
    source_text: str,
    embedding_service,
    metadata: dict[str, Any],
    debug: DebugFn | None = None,
    store_chunks: bool = True,
    existing_embeddings_by_hash: dict[str, str] | None = None,
) -> ChunkInsertResult:
    existing_embeddings_by_hash = existing_embeddings_by_hash or {}
    chunks = split_text_into_chunks(source_text, source_type=source_type)
    if debug:
        debug(
            "chunk split "
            f"source_table={source_table} source_id={source_id} "
            f"chunk_count={len(chunks)} source_text_len={len(source_text)}"
        )
    reused_count = 0
    for index, chunk_text in enumerate(chunks):
        preview = chunk_text.replace("\n", " ")[:120]
        if debug:
            debug(
                "chunk prepare "
                f"source_table={source_table} source_id={source_id} "
                f"chunk_index={index} chunk_len={len(chunk_text)} preview={preview!r}"
            )
        chunk_hash = make_chunk_hash(chunk_text)
        embedding_literal = existing_embeddings_by_hash.get(chunk_hash)
        if store_chunks:
            if embedding_literal is None:
                if debug:
                    debug(
                        "chunk cache miss "
                        f"source_table={source_table} source_id={source_id} "
                        f"chunk_index={index} chunk_hash={chunk_hash}"
                    )
                embedding = embedding_service.embed(chunk_text)
                if len(embedding.values) != EMBEDDING_DIMENSION:
                    raise ValueError(
                        f"Embedding dimension mismatch: expected {EMBEDDING_DIMENSION}, "
                        f"got {len(embedding.values)}"
                    )
                embedding_literal = _vector_literal(embedding.values)
                if debug:
                    debug(
                        "chunk embedded "
                        f"source_table={source_table} source_id={source_id} "
                        f"chunk_index={index} embedding_dim={len(embedding.values)}"
                    )
            else:
                reused_count += 1
                if debug:
                    debug(
                        "chunk cache hit "
                        f"source_table={source_table} source_id={source_id} "
                        f"chunk_index={index} chunk_hash={chunk_hash}"
                    )
            conn.execute(
                """
                insert into rag_chunks (
                  user_id,
                  source_type,
                  source_table,
                  source_id,
                  chunk_index,
                  chunk_text,
                  chunk_hash,
                  embedding,
                  metadata
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s::vector, %s)
                """,
                (
                    _normalize_user_id(user_id),
                    source_type,
                    source_table,
                    source_id,
                    index,
                    chunk_text,
                    chunk_hash,
                    embedding_literal,
                    _jsonb(metadata),
                ),
            )
    if debug and not store_chunks:
        debug(
            "embedding skipped "
            f"source_table={source_table} source_id={source_id} "
            f"reason='chunk_only_preview_mode'"
        )
    if debug:
        debug(
            "chunk insert done "
            f"source_table={source_table} source_id={source_id} "
            f"inserted_count={len(chunks)} reused_count={reused_count}"
        )
    return ChunkInsertResult(chunk_count=len(chunks), reused_count=reused_count)


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.10f}" for value in values) + "]"


def _extract_domain(normalized_url: str) -> str:
    if not normalized_url:
        return ""
    parsed = urlparse(normalized_url)
    return (parsed.netloc or "").lower()


def _sha256_or_none(text: str) -> str | None:
    if not text:
        return None
    import hashlib

    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _jsonb(value: dict[str, Any] | None) -> Jsonb | None:
    if value is None:
        return None
    return Jsonb(value)


def _normalize_user_id(user_id: str) -> str:
    # 외부 노출용 식별자는 그대로 쓰지 않고, 저장/검색용 문자열 키로만 다룬다.
    cleaned = (user_id or "").strip()
    return cleaned or "anonymous"
