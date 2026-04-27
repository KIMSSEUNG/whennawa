from __future__ import annotations

import re


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def split_text_into_sentences(text: str) -> list[str]:
    cleaned = _normalize_text(text)
    if not cleaned:
        return []

    sentences: list[str] = []
    blocks = [block.strip() for block in re.split(r"\n{2,}", cleaned) if block.strip()]

    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        # Keep intra-block text together so mid-sentence line breaks do not split content.
        block_text = " ".join(lines).strip()
        if not block_text:
            continue

        sentences.extend(_split_line_into_sentences(block_text))

    return [sentence for sentence in sentences if sentence.strip()]


def is_meaningful_sentence(sentence: str) -> bool:
    sentence = normalize_whitespace(sentence)
    if not sentence:
        return False

    if len(sentence) <= 3:
        return False

    word_count = len(re.findall(r"[A-Za-z가-힣]{2,}", sentence))
    if word_count >= 2:
        return True

    return len(sentence) >= 4


def _normalize_text(text: str) -> str:
    text = (text or "").strip()
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def _split_line_into_sentences(line: str) -> list[str]:
    parts = re.split(r"(?<=[.!?。！？])\s*", line)
    parts = [part.strip() for part in parts if part.strip()]
    if len(parts) <= 1:
        return [line.strip()]
    return parts
