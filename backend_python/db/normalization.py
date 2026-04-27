from __future__ import annotations

import hashlib
import re
from urllib.parse import parse_qsl, urlparse, urlunparse, urlencode


_COMPANY_NAME_REPLACEMENTS = (
    "(주)",
    "㈜",
    "주식회사",
)


def normalize_company_name(company_name: str) -> str:
    text = (company_name or "").strip().lower()
    for token in _COMPANY_NAME_REPLACEMENTS:
        text = text.replace(token.lower(), "")
    text = re.sub(r"\s+", "", text)
    return text


def normalize_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""

    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return raw.rstrip("/")

    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]

    path = re.sub(r"/{2,}", "/", parsed.path or "")
    if path != "/":
        path = path.rstrip("/")

    query_items = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in {"fbclid", "gclid"}
    ]
    query = urlencode(sorted(query_items), doseq=True)

    normalized = urlunparse((scheme, netloc, path or "", "", query, ""))
    return normalized.rstrip("/")


def make_content_hash(text: str) -> str:
    normalized = _normalize_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def make_chunk_hash(text: str) -> str:
    normalized = _normalize_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _normalize_text(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "")).strip()
    return cleaned

