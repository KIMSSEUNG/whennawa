import re
from collections import Counter


class JobPostParserService:
    COMMON_MARKERS = [
        "공통",
        "공통사항",
        "자격요건",
        "지원자격",
        "우대사항",
        "근무조건",
        "전형절차",
        "복리후생",
    ]

    def parse(
        self,
        lines: list[str],
        raw_text: str,
        ocr_confidence: float,
        target_position: str,
    ) -> dict:
        normalized_lines = self._normalize_lines(lines)
        target_position = self._clean_value(target_position)

        company_name = self._extract_company_name(normalized_lines)
        info_lines = self._build_info_lines(normalized_lines)

        result = {
            "companyName": company_name,
            "position": target_position,
            "info": info_lines,
            "rawText": raw_text.strip(),
        }
        result["missingFields"] = self._build_missing_fields(result)
        result["confidence"] = self._estimate_confidence(
            result=result,
            line_count=len(info_lines),
            raw_text=raw_text,
            ocr_confidence=ocr_confidence,
        )
        return result

    def _normalize_lines(self, lines: list[str]) -> list[str]:
        normalized: list[str] = []
        for raw_line in lines:
            line = re.sub(r"\s+", " ", raw_line or "").strip()
            line = re.sub(r"^[\-\*\u2022\d\.\)\]]+\s*", "", line)
            line = self._clean_value(line)
            if line:
                normalized.append(line)
        return self._dedupe(normalized)

    def _build_info_lines(self, lines: list[str]) -> list[str]:
        collected: list[str] = []
        for line in lines:
            if self._should_skip_line(line):
                continue
            collected.append(line)
        return self._dedupe(collected)

    def _extract_company_name(self, lines: list[str]) -> str:
        labeled = self._extract_field(lines, ["회사명", "기업명", "회사"])
        if labeled:
            return labeled

        candidates: Counter[str] = Counter()
        for line in lines[:8]:
            if len(line) > 40:
                continue
            candidate = re.sub(
                r"\s*(채용공고|채용|모집|공고).*$",
                "",
                line,
            ).strip("[]() ")
            if self._looks_like_company_name(candidate):
                candidates[candidate] += 1

        return candidates.most_common(1)[0][0] if candidates else ""

    def _extract_field(self, lines: list[str], labels: list[str]) -> str:
        if not lines:
            return ""

        label_pattern = "|".join(re.escape(label) for label in labels)
        for index, line in enumerate(lines):
            inline_match = re.match(
                rf"^(?:{label_pattern})\s*[:：]?\s*(.+)$",
                line,
                flags=re.IGNORECASE,
            )
            if inline_match:
                value = self._clean_value(inline_match.group(1))
                if value:
                    return value

            if any(label in line for label in labels) and index + 1 < len(lines):
                next_line = self._clean_value(lines[index + 1])
                if next_line and not self._is_section_heading(next_line):
                    return next_line
        return ""

    def _is_section_heading(self, line: str) -> bool:
        if not line:
            return False
        if len(line) > 30:
            return False
        return any(marker in line for marker in self.COMMON_MARKERS)

    def _should_skip_line(self, line: str) -> bool:
        if not line:
            return True
        if len(line) <= 1:
            return True
        if re.fullmatch(r"\d+", line):
            return True
        return False

    def _clean_value(self, value: str) -> str:
        cleaned = re.sub(r"\s+", " ", value or "").strip()
        return cleaned.strip("-:： ")

    def _looks_like_company_name(self, candidate: str) -> bool:
        if len(candidate) < 2:
            return False
        if any(marker in candidate for marker in self.COMMON_MARKERS):
            return False
        return bool(re.search(r"[A-Za-z가-힣]", candidate))

    def _build_missing_fields(self, result: dict) -> list[str]:
        missing = []
        if not result.get("companyName"):
            missing.append("companyName")
        if not result.get("position"):
            missing.append("position")
        if not result.get("info"):
            missing.append("info")
        return self._dedupe(missing)

    def _estimate_confidence(
        self,
        result: dict,
        line_count: int,
        raw_text: str,
        ocr_confidence: float,
    ) -> str:
        score = 0
        if result.get("companyName"):
            score += 1
        if result.get("position"):
            score += 1
        if line_count >= 4:
            score += 1
        if line_count >= 10:
            score += 1
        if len(raw_text) >= 120:
            score += 1
        if len(raw_text) >= 250:
            score += 1
        if ocr_confidence >= 0.8:
            score += 1

        if score >= 6:
            return "high"
        if score >= 3:
            return "medium"
        return "low"

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for item in items:
            cleaned = self._clean_value(item)
            key = cleaned.lower()
            if cleaned and key not in seen:
                seen.add(key)
                deduped.append(cleaned)
        return deduped
