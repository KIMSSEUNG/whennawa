"""Database utilities and migration runner for the backend."""

from .chunking import split_text_into_chunks
from .connection import open_connection, open_transaction
from .normalization import (
    make_content_hash,
    normalize_company_name,
    normalize_url,
)
from .repository import (
    ChunkInsertResult,
    save_analysis_result,
    insert_crawl_snapshot,
    RagChunkSearchResult,
    save_crawl_snapshot_and_refresh_chunks,
    search_rag_chunks,
    should_crawl_source,
    upsert_application_and_refresh_chunks,
    upsert_crawl_source,
    upsert_company,
    upsert_experience_and_refresh_chunks,
)
