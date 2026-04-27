from __future__ import annotations

import re

from utils.text_utils import (
    is_meaningful_sentence,
    normalize_whitespace,
    split_text_into_sentences,
)


# 회사 홈페이지 크롤링 텍스트에는 검색 품질을 떨어뜨리는 문구가 자주 섞인다.
# 너무 공격적으로 제거하지는 않고, 확실한 노이즈만 필터링한다.
NOISE_KEYWORDS = (
    "개인정보처리방침",
    "개인정보 처리방침",
    "이메일무단수집거부",
    "이메일 무단수집 거부",
    "팝업",
    "footer",
    "이용약관",
    "privacy policy",
    "cookie policy",
    "cookies policy",
    "terms of service",
    "terms and conditions",
    "copyright",
    "copyrights",
    "tel",
    "fax",
    "사이트맵",
    "sitemap",
    "로그인",
    "회원가입",
)

# 회사 소개 본문과 섞이지만 검색 품질에 거의 도움이 되지 않는
# footer / 정책 / 연락처성 문구를 위한 패턴들이다.
NOISE_PATTERNS = (
    re.compile(r"^\s*popup\b", re.IGNORECASE),
    re.compile(r"^\s*footer\b", re.IGNORECASE),
    re.compile(r"^\s*copyright\b", re.IGNORECASE),
    re.compile(r"^\s*©"),
    re.compile(r"\bprivacy\s*policy\b", re.IGNORECASE),
    re.compile(r"\bterms\s+of\s+service\b", re.IGNORECASE),
    re.compile(r"\bterms\s+and\s+conditions\b", re.IGNORECASE),
    re.compile(r"\bcookie(s)?\s+policy\b", re.IGNORECASE),
    re.compile(r"\bemail\s*.*무단수집\s*거부\b", re.IGNORECASE),
    re.compile(r"\b이메일\s*무단수집\s*거부\b"),
    re.compile(r"\b개인정보\s*처리\s*방침\b"),
    re.compile(r"\b이용\s*약관\b"),
    re.compile(r"\bTEL\.?\b", re.IGNORECASE),
    re.compile(r"\bFAX\.?\b", re.IGNORECASE),
    re.compile(r"\btel[:\s]", re.IGNORECASE),
    re.compile(r"\bfax[:\s]", re.IGNORECASE),
)

_SOURCE_TYPE_ALIASES = {
    "company_profile": "company_profile",
    "crawl_snapshots": "company_profile",
    "job_post": "application",
    "application_entries": "application",
    "experience": "experience",
    "experience_entries": "experience",
}


def split_text_into_chunks(
    text: str,
    *,
    source_type: str,
) -> list[str]:
    # source_type별로 chunk 정책을 다르게 적용한다.
    normalized_source_type = _SOURCE_TYPE_ALIASES.get(source_type, source_type)
    cleaned = _normalize_text(text)
    if not cleaned:
        return []

    if normalized_source_type == "company_profile":
        return _chunk_company_profile(cleaned)

    if normalized_source_type == "application":
        return _chunk_application(cleaned)

    if normalized_source_type == "experience":
        return _chunk_experience(cleaned)

    # 알 수 없는 source_type은 보수적으로 문장 기반 chunking을 적용한다.
    return _chunk_sentence_based(cleaned, max_chars=700)


def _normalize_text(text: str) -> str:
    # Windows 개행을 표준화하고, 연속 공백/줄바꿈을 정리한다.
    text = (text or "").strip()
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _remove_noise_lines(text: str) -> str:
    # Keep block structure, then let sentence-level filtering decide what survives.
    kept_blocks: list[str] = []
    for raw_block in re.split(r"\n{2,}", text):
        block_lines: list[str] = []
        for raw_line in raw_block.splitlines():
            line = normalize_whitespace(raw_line)
            if not line:
                continue
            block_lines.append(line)

        if block_lines:
            # Join lines inside the same block so broken sentences can be re-split later.
            kept_blocks.append(" ".join(block_lines).strip())

    return "\n\n".join(kept_blocks).strip()


def _has_meaningful_content(line: str) -> bool:
    return len(re.findall(r"[A-Za-z?-?]{2,}", line)) >= 4


def _is_meaningful_sentence(sentence: str) -> bool:
    sentence = normalize_whitespace(sentence)
    if not sentence:
        return False

    if len(sentence) <= 3:
        return False

    lowered = sentence.lower()
    if any(pattern.search(sentence) for pattern in NOISE_PATTERNS):
        return False
    if any(keyword in lowered for keyword in NOISE_KEYWORDS):
        return False

    word_count = len(re.findall(r"[A-Za-z?-?]{2,}", sentence))
    if word_count >= 2:
        return True

    return len(sentence) >= 4


def _chunk_company_profile(text: str) -> list[str]:
    # 회사 크롤링 데이터는 노이즈 제거 후 문장 기반 chunking을 수행한다.
    cleaned = _remove_noise_lines(text)
    if not cleaned:
        return []
    return _chunk_sentence_based(cleaned, max_chars=700)


def _chunk_application(text: str) -> list[str]:
    # 채용공고/지원공고는 일반적으로 길지 않다.
    # 1200자 이하이면 통째로 1 chunk로 두고, 그보다 길면 문장 기반으로 나눈다.
    if len(text) <= 1200:
        return [text.strip()]
    return _chunk_sentence_based(text, max_chars=700)


def _chunk_experience(text: str) -> list[str]:
    # 경험 텍스트는 프로젝트 단위 chunk를 우선한다.
    # 번호 패턴이 있으면 프로젝트 블록 단위로 먼저 묶고,
    # 없으면 일반 문장 기반 chunking으로 fallback한다.
    numbered_blocks = _extract_numbered_blocks(text)
    if numbered_blocks:
        return _chunk_experience_blocks(numbered_blocks)
    return _chunk_sentence_based(text, max_chars=700)


def _extract_numbered_blocks(text: str) -> list[str]:
    # 줄 시작이 "1.", "2.", "3." 같은 패턴이면 프로젝트 블록으로 본다.
    lines = [line.rstrip() for line in text.splitlines()]
    has_numbered_heading = any(re.match(r"^\s*\d+\.\s+", line) for line in lines)
    if not has_numbered_heading:
        return []

    blocks: list[list[str]] = []
    current_block: list[str] = []

    for line in lines:
        normalized = normalize_whitespace(line)
        if not normalized:
            continue

        if re.match(r"^\d+\.\s+", normalized):
            if current_block:
                blocks.append(current_block)
            current_block = [normalized]
            continue

        if current_block:
            current_block.append(normalized)
        else:
            # 번호 패턴보다 앞에 있는 소개 문구는 첫 번째 블록에 붙인다.
            current_block = [normalized]

    if current_block:
        blocks.append(current_block)

    return ["\n".join(block).strip() for block in blocks if "\n".join(block).strip()]


def _chunk_experience_blocks(blocks: list[str]) -> list[str]:
    # 프로젝트 하나 = chunk 하나를 기본으로 한다.
    # 단, 블록이 너무 길면 그때만 문장 기반으로 추가 분리한다.
    chunks: list[str] = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue

        if len(block) <= 700:
            chunks.append(block)
            continue

        chunks.extend(_chunk_sentence_based(block, max_chars=700))

    return chunks


def _chunk_sentence_based(text: str, *, max_chars: int) -> list[str]:
    # 일반 문장 chunking은 sliding window로 처리한다.
    # 문장 경계를 넘나드는 문맥이 잘리지 않도록 앞 chunk의 마지막 문장을 다음 chunk에 1문장 겹친다.
    sentences: list[str] = []
    for sentence in split_text_into_sentences(text):
        sentence = normalize_whitespace(sentence)
        if not sentence:
            continue
        if not is_meaningful_sentence(sentence):
            continue
        if len(sentence) <= max_chars:
            sentences.append(sentence)
            continue

        # 너무 긴 단일 문장은 먼저 안전하게 쪼갠다.
        sentences.extend(_split_long_sentence(sentence, max_chars=max_chars))

    if not sentences:
        return [text.strip()] if text.strip() else []

    chunks: list[str] = []
    overlap_sentences = _get_sentence_overlap_count(max_chars)
    if len(sentences) <= 1:
        overlap_sentences = 0
    start_index = 0

    while start_index < len(sentences):
        current_sentences: list[str] = []
        current_length = 0
        end_index = start_index

        while end_index < len(sentences):
            sentence = sentences[end_index]
            separator_cost = 1 if current_sentences else 0
            candidate_length = current_length + separator_cost + len(sentence)
            if current_sentences and candidate_length > max_chars:
                break

            current_sentences.append(sentence)
            current_length = candidate_length
            end_index += 1

        if not current_sentences:
            break

        chunks.append(_join_sentences(current_sentences))

        if end_index >= len(sentences):
            break

        next_start = end_index - overlap_sentences
        if next_start <= start_index:
            next_start = start_index + 1
        start_index = next_start

    return [chunk for chunk in chunks if chunk.strip()]


def _get_sentence_overlap_count(max_chars: int) -> int:
    if max_chars >= 1000:
        return 2
    return 1


def _split_into_sentences(text: str) -> list[str]:
    return split_text_into_sentences(text)


def _split_line_into_sentences(line: str) -> list[str]:
    # 문장부호가 있는 경우 그 지점에서 분리한다.
    # 예: ., ?, !, 다., 요., 함., 됨., 임.
    parts = re.split(r"(?<=[.!?。！？])\s+", line)
    parts = [part.strip() for part in parts if part.strip()]
    if len(parts) <= 1:
        return [line.strip()]
    return parts


def _split_long_sentence(sentence: str, *, max_chars: int) -> list[str]:
    # 정말 긴 문장만 예외적으로 단어(띄어쓰기) 기준으로 나눈다.
    words = [word for word in sentence.split(" ") if word]
    if not words:
        return [sentence.strip()]

    chunks: list[str] = []
    current_words: list[str] = []
    current_length = 0

    for word in words:
        separator_cost = 1 if current_words else 0
        candidate_length = current_length + separator_cost + len(word)

        if current_words and candidate_length > max_chars:
            chunks.append(" ".join(current_words).strip())
            current_words = [word]
            current_length = len(word)
            continue

        current_words.append(word)
        current_length = candidate_length

    if current_words:
        chunks.append(" ".join(current_words).strip())

    return [chunk for chunk in chunks if chunk.strip()]


def _merge_small_chunks(
    chunks: list[str],
    *,
    min_chars: int,
    max_chars: int,
) -> list[str]:
    # 너무 짧은 chunk는 앞 chunk와 합쳐서 문맥 손실을 줄인다.
    if not chunks:
        return []

    merged: list[str] = []
    for chunk in chunks:
        chunk = _normalize_whitespace(chunk)
        if not chunk:
            continue

        if merged:
            candidate = f"{merged[-1]} {chunk}".strip()
            if len(candidate) <= max_chars and len(merged[-1]) < min_chars:
                merged[-1] = candidate
                continue

        merged.append(chunk)

    return merged


def _join_sentences(sentences: list[str]) -> str:
    return " ".join(sentence.strip() for sentence in sentences if sentence.strip()).strip()
