from pathlib import Path
import sys
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
from typing import Callable, Iterable
from urllib.parse import urljoin, urlparse, urlunparse
import re

import httpx

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from utils.text_utils import is_meaningful_sentence, normalize_whitespace, split_text_into_sentences


@dataclass(slots=True)
class CompanyCrawlResult:
    company_url: str
    final_url: str
    company_name: str
    title: str
    description: str
    headings: list[str]
    links: list[str]
    raw_text: str
    truncated: bool = False


@dataclass(slots=True)
class _CrawledPage:
    # 한 번 방문한 페이지의 추출 결과를 담는다.
    url: str
    final_url: str
    title: str
    description: str
    headings: list[str]
    links: list[str]
    raw_text: str


class CompanyCrawlError(RuntimeError):
    pass


class _CompanyHTMLParser(HTMLParser):
    BLOCK_TAGS = {
        "article",
        "div",
        "footer",
        "h1",
        "h2",
        "h3",
        "h4",
        "header",
        "li",
        "main",
        "p",
        "section",
        "table",
        "tbody",
        "td",
        "th",
        "tr",
    }
    SKIP_TAGS = {"script", "style", "noscript", "svg", "path"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._skip_depth = 0
        self._pieces: list[str] = []
        self._title_pieces: list[str] = []
        self._headings: list[str] = []
        self._links: list[str] = []
        self._current_href: str = ""
        self._title_tag_depth = 0
        self._heading_tag: str = ""

    @property
    def title(self) -> str:
        return self._collapse(self._title_pieces)

    @property
    def headings(self) -> list[str]:
        return self._dedupe(self._headings)

    @property
    def links(self) -> list[str]:
        return self._dedupe(self._links)

    @property
    def raw_text(self) -> str:
        return self._collapse(self._pieces)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.SKIP_TAGS:
            self._skip_depth += 1
            return

        if self._skip_depth > 0:
            return

        if tag == "title":
            self._title_tag_depth += 1
            return

        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._heading_tag = tag
            self._pieces.append("\n")

        if tag in self.BLOCK_TAGS:
            self._pieces.append("\n")

        if tag == "img":
            alt = dict(attrs).get("alt")
            if alt:
                alt_text = re.sub(r"\s+", " ", unescape(alt or "")).strip()
                if alt_text:
                    self._pieces.append(alt_text)
                    self._pieces.append(" ")
                    self._headings.append(alt_text)

        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self._current_href = href

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            return

        if self._skip_depth > 0:
            return

        if tag == "title" and self._title_tag_depth > 0:
            self._title_tag_depth -= 1
            return

        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._heading_tag = ""
            self._pieces.append("\n")

        if tag == "a" and self._current_href:
            self._links.append(self._current_href)
            self._current_href = ""

        if tag in self.BLOCK_TAGS:
            self._pieces.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return

        text = re.sub(r"\s+", " ", unescape(data or "")).strip()
        if not text:
            return

        if self._title_tag_depth > 0:
            self._title_pieces.append(text)

        if self._heading_tag:
            self._headings.append(text)

        self._pieces.append(text)
        self._pieces.append(" ")

    def _collapse(self, pieces: Iterable[str]) -> str:
        text = "".join(pieces)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text.strip()

    def _dedupe(self, values: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for value in values:
            cleaned = re.sub(r"\s+", " ", value).strip()
            key = cleaned.lower()
            if cleaned and key not in seen:
                seen.add(key)
                deduped.append(cleaned)
        return deduped


class CompanyCrawlService:
    MAX_PAGES = 12
    MAX_FOLLOW_DEPTH = 3
    MAX_LINKS_PER_PAGE = 8

    POSITIVE_LINK_KEYWORDS = (
        "회사소개",
        "인사말",
        "about",
        "vision",
        "비전",
        "history",
        "연혁",
        "사업",
        "사업분야",
        "business",
        "service",
        "solution",
        "제품",
        "솔루션",
        "인재상",
        "talent",
        "기업문화",
        "culture",
        "복지",
        "welfare",
        "채용",
        "recruit",
        "career",
        "입사지원",
    )

    NEGATIVE_LINK_KEYWORDS = (
        "개인정보처리방침",
        "privacy",
        "이메일무단수집거부",
        "login",
        "logout",
        "admin",
        "popup",
        "copyright",
        "sns",
        "facebook",
        "instagram",
        "youtube",
        "tel:",
        "mailto:",
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".zip",
    )

    NEGATIVE_PATH_PATTERNS = (
        r"board\.php\?bo_table=",
        r"bbs/board\.php",
        r"/board/",
        r"/gallery/",
        r"/news/",
        r"/notice/",
        r"/view\.php\?",
    )

    NOISE_LINE_KEYWORDS = (
        "개인정보처리방침",
        "이메일무단수집거부",
        "팝업레이어",
        "privacy",
        "terms",
        "cookie",
        "login",
        "logout",
        "copyright",
        "tel",
        "fax",
    )

    def __init__(self, timeout_seconds: float = 20.0) -> None:
        self._timeout_seconds = timeout_seconds

    async def crawl(
        self,
        company_url: str,
        debug: Callable[[str], None] | None = None,
    ) -> CompanyCrawlResult:
        normalized_url = self._normalize_url(company_url)
        pages = await self._crawl_pages(normalized_url, debug=debug)
        if not pages:
            raise CompanyCrawlError("회사 URL에서 추출 가능한 페이지를 찾지 못했다.")

        root_page = pages[0]
        company_name = self._guess_company_name(
            root_page.title,
            [heading for page in pages for heading in page.headings],
            root_page.final_url,
        )
        raw_text = "\n\n".join(
            section
            for section in (
                self._build_raw_text(
                    title=page.title,
                    description=page.description,
                    headings=page.headings,
                    body_text=page.raw_text,
                )
                for page in pages
            )
            if section
        )
        raw_text = self._remove_noise_text(raw_text)
        raw_text, truncated = self._truncate_raw_text(raw_text)

        all_headings = self._dedupe([heading for page in pages for heading in page.headings])
        all_links = self._normalize_links(
            [link for page in pages for link in page.links],
            root_page.final_url,
        )

        if debug:
            debug(
                "crawl summary "
                f"pages={len(pages)} headings={len(all_headings)} links={len(all_links)} "
                f"raw_len={len(raw_text)} truncated={truncated}"
            )

        return CompanyCrawlResult(
            company_url=normalized_url,
            final_url=root_page.final_url,
            company_name=company_name,
            title=root_page.title,
            description=root_page.description,
            headings=self._limit_items(all_headings, 30),
            links=self._limit_items(all_links, 30),
            raw_text=raw_text,
            truncated=truncated,
        )

    def _normalize_url(self, company_url: str) -> str:
        parsed = urlparse(company_url.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise CompanyCrawlError("companyUrl 형식이 올바르지 않다.")
        return self._normalize_internal_url(company_url.strip())

    async def _crawl_pages(
        self,
        start_url: str,
        debug: Callable[[str], None] | None = None,
    ) -> list[_CrawledPage]:
        visited: set[str] = set()
        queue: list[tuple[str, int]] = [(start_url, 0)]
        pages: list[_CrawledPage] = []

        while queue and len(pages) < self.MAX_PAGES:
            current_url, depth = queue.pop(0)
            normalized_url = self._normalize_internal_url(current_url)
            if not normalized_url:
                continue
            if normalized_url in visited:
                if debug:
                    debug(f"crawl skip url={normalized_url} reason=visited")
                continue
            visited.add(normalized_url)

            if debug:
                debug(f"crawl visit url={normalized_url} depth={depth}")

            response = await self._fetch_html(normalized_url)
            self._validate_response(response)

            parser = _CompanyHTMLParser()
            parser.feed(response.text)

            page = _CrawledPage(
                url=normalized_url,
                final_url=self._normalize_internal_url(str(response.url)),
                title=self._clean(parser.title),
                description=self._extract_description(response.text),
                headings=self._limit_items(parser.headings, 30),
                links=self._limit_items(parser.links, 60),
                raw_text=self._remove_noise_text(parser.raw_text),
            )
            pages.append(page)

            if depth >= self.MAX_FOLLOW_DEPTH:
                continue

            next_links = self._select_follow_links(
                page.links,
                page.final_url or normalized_url,
                debug=debug,
            )
            for link in next_links:
                if link not in visited:
                    queue.append((link, depth + 1))

        return pages

    async def _fetch_html(self, normalized_url: str) -> httpx.Response:
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout_seconds,
                follow_redirects=True,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    )
                },
            ) as client:
                return await client.get(normalized_url)
        except httpx.HTTPError as exc:
            raise CompanyCrawlError(f"회사 URL 크롤링에 실패했다: {exc}") from exc

    def _validate_response(self, response: httpx.Response) -> None:
        if response.status_code >= 400:
            raise CompanyCrawlError(
                f"회사 URL 응답이 정상적이지 않다: HTTP {response.status_code}"
            )

        content_type = (response.headers.get("content-type") or "").lower()
        if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
            raise CompanyCrawlError("HTML 문서가 아니어서 크롤링할 수 없다.")

    def _select_follow_links(
        self,
        links: list[str],
        base_url: str,
        debug: Callable[[str], None] | None = None,
    ) -> list[str]:
        scored: list[tuple[int, str]] = []
        for link in self._dedupe(links):
            reason = self._exclude_reason(link)
            if reason:
                if debug:
                    debug(f"crawl exclude link={link!r} reason={reason}")
                continue

            absolute = self._normalize_internal_url(urljoin(base_url, link))
            if not absolute:
                if debug:
                    debug(f"crawl exclude link={link!r} reason=invalid_url")
                continue
            if not self._is_same_site(absolute, base_url):
                if debug:
                    debug(f"crawl exclude link={link!r} reason=external_domain")
                continue

            score = self._score_follow_link(absolute)
            if score <= 0:
                if debug:
                    debug(f"crawl exclude link={absolute!r} reason=low_score")
                continue

            scored.append((score, absolute))

        scored.sort(key=lambda item: item[0], reverse=True)
        selected = [link for _, link in scored[: self.MAX_LINKS_PER_PAGE]]
        if debug and selected:
            for score, link in scored[: self.MAX_LINKS_PER_PAGE]:
                debug(f"crawl select link={link!r} score={score}")
        return selected

    def _score_follow_link(self, absolute_url: str) -> int:
        parsed = urlparse(absolute_url)
        path = f"{parsed.netloc}{parsed.path} {parsed.query}".lower()
        score = 0

        for keyword in self.POSITIVE_LINK_KEYWORDS:
            if keyword.lower() in path:
                score += 10

        if any(keyword in path for keyword in ("company", "about", "career", "recruit")):
            score += 5

        if parsed.path in {"", "/"}:
            score -= 2

        return score

    def _exclude_reason(self, link: str) -> str:
        lowered = (link or "").lower().strip()
        if not lowered:
            return "empty"

        for keyword in self.NEGATIVE_LINK_KEYWORDS:
            if keyword.lower() in lowered:
                return f"negative_keyword:{keyword}"

        for pattern in self.NEGATIVE_PATH_PATTERNS:
            if re.search(pattern, lowered, flags=re.IGNORECASE):
                return f"negative_pattern:{pattern}"

        return ""

    def _normalize_internal_url(self, url: str, base_url: str | None = None) -> str:
        absolute = urljoin(base_url, url) if base_url else url
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return ""

        normalized_path = re.sub(r"/{2,}", "/", parsed.path or "/")
        normalized_path = normalized_path.rstrip("/") or "/"
        normalized = urlunparse(
            (
                parsed.scheme.lower(),
                self._normalize_netloc(parsed.netloc),
                normalized_path,
                "",
                "",
                "",
            )
        )
        return normalized

    def _is_same_site(self, absolute_url: str, base_url: str) -> bool:
        parsed_target = urlparse(absolute_url)
        parsed_base = urlparse(base_url)
        return self._normalize_netloc(parsed_target.netloc) == self._normalize_netloc(
            parsed_base.netloc
        )

    def _extract_description(self, html_text: str) -> str:
        match = re.search(
            r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
            html_text,
            flags=re.IGNORECASE,
        )
        if match:
            return self._clean(match.group(1))

        og_match = re.search(
            r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
            html_text,
            flags=re.IGNORECASE,
        )
        if og_match:
            return self._clean(og_match.group(1))
        return ""

    def _guess_company_name(
        self,
        title: str,
        headings: list[str],
        final_url: str,
    ) -> str:
        candidates = [title, *headings[:3]]
        for candidate in candidates:
            cleaned = self._clean(candidate)
            if not cleaned:
                continue
            parts = re.split(r"\s*[\|\-:·>]\s*", cleaned)
            if parts and parts[0]:
                return parts[0][:40].strip()

        parsed = urlparse(final_url)
        host = self._normalize_netloc(parsed.netloc.split(":")[0])
        return host.split(".")[0] if host else ""

    def _build_raw_text(
        self,
        title: str,
        description: str,
        headings: list[str],
        body_text: str,
    ) -> str:
        # Build a sentence-level raw text so downstream filtering stays consistent.
        parts = [part for part in [title, description, *headings, body_text] if part]
        sentences: list[str] = []
        for part in parts:
            for sentence in split_text_into_sentences(part):
                normalized = normalize_whitespace(sentence)
                if not normalized:
                    continue
                if not is_meaningful_sentence(normalized):
                    continue
                sentences.append(normalized)
        return "\n".join(self._dedupe(sentences))

    def _remove_noise_text(self, text: str) -> str:
        # Normalize at sentence level so line breaks inside a sentence do not break content.
        cleaned_sentences: list[str] = []
        for sentence in split_text_into_sentences(text):
            normalized = normalize_whitespace(sentence)
            if not normalized:
                continue
            if not is_meaningful_sentence(normalized):
                continue
            if self._is_obvious_noise_sentence(normalized):
                continue
            cleaned_sentences.append(normalized)
        return "\n".join(self._dedupe(cleaned_sentences))

    def _is_obvious_noise_sentence(self, sentence: str) -> bool:
        if self._has_meaningful_content(sentence) and len(sentence) > 24:
            return False

        lowered = sentence.lower()
        if len(sentence) <= 4 and any(ch in sentence for ch in ("|", "-", ":")):
            return True
        if any(pattern.search(sentence) for pattern in self._noise_line_patterns()):
            return True
        return any(keyword.lower() in lowered for keyword in self.NOISE_LINE_KEYWORDS)

    def _has_meaningful_content(self, line: str) -> bool:
        return len(re.findall(r"[A-Za-z?-?]{2,}", line)) >= 4

    def _noise_line_patterns(self) -> tuple[re.Pattern[str], ...]:
        return (
            re.compile(r"^\s*popup\b", re.IGNORECASE),
            re.compile(r"^\s*footer\b", re.IGNORECASE),
            re.compile(r"^\s*copyright\b", re.IGNORECASE),
            re.compile(r"\bprivacy\s*policy\b", re.IGNORECASE),
            re.compile(r"\bterms\s+of\s+service\b", re.IGNORECASE),
            re.compile(r"\bterms\s+and\s+conditions\b", re.IGNORECASE),
            re.compile(r"\bcookie(s)?\s+policy\b", re.IGNORECASE),
            re.compile(r"\bTEL\.?\b", re.IGNORECASE),
            re.compile(r"\bFAX\.?\b", re.IGNORECASE),
            re.compile(r"\btel[:\s]", re.IGNORECASE),
            re.compile(r"\bfax[:\s]", re.IGNORECASE),
        )

    def _truncate_raw_text(self, raw_text: str, limit: int = 12000) -> tuple[str, bool]:
        if len(raw_text) <= limit:
            return raw_text, False
        return raw_text[:limit].rstrip(), True

    def _normalize_links(self, links: list[str], base_url: str) -> list[str]:
        normalized: list[str] = []
        for link in links:
            if not link:
                continue
            absolute = self._normalize_internal_url(link, base_url=base_url)
            if absolute:
                normalized.append(absolute)
        return self._dedupe(normalized)

    def _limit_items(self, items: list[str], limit: int) -> list[str]:
        return items[:limit]

    def _clean(self, value: str) -> str:
        return re.sub(r"\s+", " ", (value or "")).strip()

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for item in items:
            cleaned = self._clean(item)
            key = cleaned.lower()
            if cleaned and key not in seen:
                seen.add(key)
                deduped.append(cleaned)
        return deduped

    def _normalize_netloc(self, netloc: str) -> str:
        netloc = (netloc or "").lower()
        if netloc.startswith("www."):
            return netloc[4:]
        return netloc
