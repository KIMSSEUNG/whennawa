from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
import re
import traceback

from core.model_settings import OCRStageSettings


@dataclass(slots=True)
class OCRResult:
    raw_text: str
    lines: list[str]
    average_confidence: float
    provider_name: str


class OCRProviderUnavailableError(RuntimeError):
    pass


class OCRExecutionError(RuntimeError):
    pass


class OCRProvider(Protocol):
    name: str

    def extract(self, image_bytes: bytes, filename: str) -> OCRResult:
        ...


class TestTextOCRProvider:
    name = "ocr_test"

    def __init__(self, text: str):
        self._text = text.strip()

    def extract(self, image_bytes: bytes, filename: str) -> OCRResult:
        lines = [
            re.sub(r"\s+", " ", line).strip()
            for line in self._text.splitlines()
            if re.sub(r"\s+", " ", line).strip()
        ]
        return OCRResult(
            raw_text=self._text,
            lines=lines,
            average_confidence=1.0 if lines else 0.0,
            provider_name=self.name,
        )


def _debug(message: str) -> None:
    print(f"[ocr_service] {message}", flush=True)


class OCRService:
    def __init__(self, provider: OCRProvider):
        self.provider = provider

    def analyze(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str | None = None,
        target_position: str = "",
        selected_page_numbers: list[int] | None = None,
    ) -> OCRResult:
        _debug(
            "analyze start "
            f"filename={filename} content_type={content_type} "
            f"provider={self.provider.name} target_position={target_position!r}"
        )

        return self.provider.extract(image_bytes=file_bytes, filename=filename)

    def _analyze_pdf(
        self,
        file_bytes: bytes,
        filename: str,
        target_position: str = "",
        selected_page_numbers: list[int] | None = None,
    ) -> OCRResult:
        try:
            import fitz
        except ImportError as exc:
            raise OCRProviderUnavailableError(
                "PDF OCR requires PyMuPDF. Install it with `pip install PyMuPDF`."
            ) from exc

        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            _debug(f"failed to open PDF: {exc}")
            traceback.print_exc()
            raise OCRExecutionError("Failed to open PDF file.") from exc

        all_lines: list[str] = []
        confidences: list[float] = []
        stem = Path(filename).stem or "document"

        try:
            if document.page_count <= 0:
                raise OCRExecutionError("PDF contains no pages.")

            selected_pages = self._select_pdf_pages(
                document=document,
                target_position=target_position,
                selected_page_numbers=selected_page_numbers,
            )
            _debug(
                "pdf opened "
                f"page_count={document.page_count} "
                f"selected_pages={[page_index + 1 for page_index in selected_pages]}"
            )

            for page_index in selected_pages:
                page = document.load_page(page_index)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                page_bytes = pixmap.tobytes("png")
                _debug(
                    f"processing pdf page={page_index + 1} rendered_png_size={len(page_bytes)}"
                )
                page_result = self.provider.extract(
                    image_bytes=page_bytes,
                    filename=f"{stem}-page-{page_index + 1}.png",
                )

                if page_result.lines:
                    all_lines.extend(page_result.lines)
                    confidences.append(page_result.average_confidence)
                    _debug(
                        f"page={page_index + 1} success line_count={len(page_result.lines)} "
                        f"avg_conf={page_result.average_confidence:.4f}"
                    )

            if not all_lines:
                raise OCRExecutionError("PDF OCR did not extract any text.")

            average_confidence = (
                sum(confidences) / len(confidences) if confidences else 0.0
            )
            _debug(
                f"pdf analyze success total_line_count={len(all_lines)} "
                f"avg_conf={average_confidence:.4f}"
            )
            return OCRResult(
                raw_text="\n".join(all_lines),
                lines=all_lines,
                average_confidence=average_confidence,
                provider_name=f"{self.provider.name}-pdf",
            )
        except OCRExecutionError:
            _debug("OCRExecutionError raised during PDF analyze")
            traceback.print_exc()
            raise
        except Exception as exc:
            _debug(f"unexpected PDF OCR error: {exc}")
            traceback.print_exc()
            raise OCRExecutionError(f"PDF OCR failed: {exc}") from exc
        finally:
            document.close()

    def _analyze_pdf_first_page(self, file_bytes: bytes, filename: str) -> OCRResult:
        try:
            import fitz
        except ImportError as exc:
            raise OCRProviderUnavailableError(
                "PDF OCR requires PyMuPDF. Install it with `pip install PyMuPDF`."
            ) from exc

        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            _debug(f"failed to open PDF: {exc}")
            traceback.print_exc()
            raise OCRExecutionError("Failed to open PDF file.") from exc

        try:
            if document.page_count <= 0:
                raise OCRExecutionError("PDF contains no pages.")

            page = document.load_page(0)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            page_bytes = pixmap.tobytes("png")
            _debug(
                "pdf first-page mode "
                f"page_count={document.page_count} rendered_png_size={len(page_bytes)}"
            )
            page_result = self.provider.extract(
                image_bytes=page_bytes,
                filename=f"{Path(filename).stem or 'document'}-page-1.png",
            )

            if not page_result.lines:
                raise OCRExecutionError("PDF OCR did not extract any text from first page.")

            return OCRResult(
                raw_text=page_result.raw_text,
                lines=page_result.lines,
                average_confidence=page_result.average_confidence,
                provider_name=f"{self.provider.name}-pdf-first-page",
            )
        except OCRExecutionError:
            _debug("OCRExecutionError raised during PDF first-page analyze")
            traceback.print_exc()
            raise
        except Exception as exc:
            _debug(f"unexpected PDF first-page OCR error: {exc}")
            traceback.print_exc()
            raise OCRExecutionError(f"PDF first-page OCR failed: {exc}") from exc
        finally:
            document.close()

    def _analyze_pdf_selected_pages(
        self,
        file_bytes: bytes,
        filename: str,
        selected_page_numbers: list[int],
    ) -> OCRResult:
        try:
            import fitz
        except ImportError as exc:
            raise OCRProviderUnavailableError(
                "PDF OCR requires PyMuPDF. Install it with `pip install PyMuPDF`."
            ) from exc

        try:
            document = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            _debug(f"failed to open PDF: {exc}")
            traceback.print_exc()
            raise OCRExecutionError("Failed to open PDF file.") from exc

        all_lines: list[str] = []
        confidences: list[float] = []
        stem = Path(filename).stem or "document"

        try:
            if document.page_count <= 0:
                raise OCRExecutionError("PDF contains no pages.")

            normalized_pages = [
                page_number
                for page_number in selected_page_numbers
                if 1 <= page_number <= document.page_count
            ]
            if not normalized_pages:
                raise OCRExecutionError("No valid PDF pages were selected.")

            _debug(
                "pdf selected-page mode "
                f"page_count={document.page_count} selected_pages={normalized_pages}"
            )

            for page_number in normalized_pages:
                page = document.load_page(page_number - 1)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                page_bytes = pixmap.tobytes("png")
                _debug(
                    f"processing selected pdf page={page_number} rendered_png_size={len(page_bytes)}"
                )
                page_result = self.provider.extract(
                    image_bytes=page_bytes,
                    filename=f"{stem}-page-{page_number}.png",
                )

                if page_result.lines:
                    all_lines.extend(page_result.lines)
                    confidences.append(page_result.average_confidence)
                    _debug(
                        f"page={page_number} success line_count={len(page_result.lines)} "
                        f"avg_conf={page_result.average_confidence:.4f}"
                    )

            if not all_lines:
                raise OCRExecutionError("PDF OCR did not extract any text from selected pages.")

            average_confidence = (
                sum(confidences) / len(confidences) if confidences else 0.0
            )
            _debug(
                f"pdf selected-page analyze success total_line_count={len(all_lines)} "
                f"avg_conf={average_confidence:.4f}"
            )
            return OCRResult(
                raw_text="\n".join(all_lines),
                lines=all_lines,
                average_confidence=average_confidence,
                provider_name=f"{self.provider.name}-pdf-selected",
            )
        except OCRExecutionError:
            _debug("OCRExecutionError raised during PDF selected-page analyze")
            traceback.print_exc()
            raise
        except Exception as exc:
            _debug(f"unexpected PDF selected-page OCR error: {exc}")
            traceback.print_exc()
            raise OCRExecutionError(f"PDF selected-page OCR failed: {exc}") from exc
        finally:
            document.close()

    def _select_pdf_pages(
        self,
        document,
        target_position: str,
        selected_page_numbers: list[int] | None = None,
    ) -> list[int]:
        if document.page_count <= 0:
            return []

        if selected_page_numbers:
            normalized = sorted(
                {
                    page_number - 1
                    for page_number in selected_page_numbers
                    if 1 <= page_number <= document.page_count
                }
            )
            if normalized:
                return normalized[: self._max_pdf_ocr_pages()]

        selected_pages: set[int] = {0}
        if target_position.strip():
            keywords = self._build_target_keywords(target_position)
            if keywords:
                for page_index in range(document.page_count):
                    page_text = self._get_page_text(document, page_index)
                    if page_text and any(keyword in page_text for keyword in keywords):
                        selected_pages.add(page_index)
                        if page_index + 1 < document.page_count:
                            selected_pages.add(page_index + 1)

        common_keywords = self._build_common_keywords()
        if common_keywords:
            for page_index in range(document.page_count):
                page_text = self._get_page_text(document, page_index)
                if page_text and any(keyword in page_text for keyword in common_keywords):
                    selected_pages.add(page_index)
                    if page_index + 1 < document.page_count:
                        selected_pages.add(page_index + 1)

        ordered_pages = sorted(selected_pages)
        return ordered_pages[: self._max_pdf_ocr_pages()]

    def _build_target_keywords(self, target_position: str) -> list[str]:
        normalized = self._normalize_text(target_position)
        if not normalized:
            return []

        parts = {
            part.strip()
            for part in re.split(r"[\s,/\-\(\)\[\]·]+", normalized)
            if part.strip()
        }
        parts.add(normalized)
        return [part for part in parts if len(part) >= 2]

    def _build_common_keywords(self) -> list[str]:
        return [
            "공통",
            "공통사항",
            "공통 자격",
            "공통 자격요건",
            "자격요건",
            "지원자격",
            "우대사항",
            "근무조건",
            "전형절차",
            "복리후생",
        ]

    def _get_page_text(self, document, page_index: int) -> str:
        page = document.load_page(page_index)
        return self._normalize_text(page.get_text("text") or "")

    def _normalize_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip().lower()

    def _max_pdf_ocr_pages(self) -> int:
        return 4


def build_ocr_service(settings: OCRStageSettings) -> OCRService:
    if settings.api.test_mode:
        _debug("ocr test mode enabled; using configured test text provider")
        return OCRService(TestTextOCRProvider(settings.api.test_text))

    preferred = settings.provider
    provider_names = _resolve_provider_order(preferred)
    errors: list[str] = []
    _debug(f"build_ocr_service preferred={preferred} provider_order={provider_names}")

    for provider_name in provider_names:
        try:
            provider = _create_provider(provider_name, settings)
            _debug(f"provider selected={provider_name}")
            return OCRService(provider)
        except OCRProviderUnavailableError as exc:
            _debug(f"provider unavailable={provider_name} error={exc}")
            errors.append(str(exc))

    joined = "; ".join(errors) if errors else "No OCR provider configured."
    raise OCRProviderUnavailableError(
        "No usable OCR provider was found. "
        "Check OCR_PROVIDER and provider-specific environment variables. "
        f"details={joined}"
    )


def _resolve_provider_order(preferred: str) -> list[str]:
    if preferred == "auto":
        return ["openapi", "paddle", "easyocr"]
    if preferred == "easyocr":
        return ["easyocr", "paddle", "openapi"]
    if preferred in {"api", "openapi", "openai"}:
        return ["openapi"]
    if preferred == "open_vision_stub":
        return ["open_vision_stub"]
    return ["openapi", "paddle", "easyocr"]


def _create_provider(provider_name: str, settings: OCRStageSettings):
    if provider_name == "paddle":
        from services.ocr_providers.paddle_ocr_provider import PaddleOCRProvider

        return PaddleOCRProvider()
    if provider_name == "easyocr":
        from services.ocr_providers.easy_ocr_provider import EasyOCRProvider

        return EasyOCRProvider()
    if provider_name == "openapi":
        from services.ocr_providers.api_ocr_provider import ApiOCRProvider

        return ApiOCRProvider(settings.api)
    if provider_name == "open_vision_stub":
        from services.ocr_providers.open_vision_stub_provider import (
            OpenVisionStubProvider,
        )

        return OpenVisionStubProvider()

    raise OCRProviderUnavailableError(f"Unsupported OCR provider: {provider_name}")
