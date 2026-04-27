from pathlib import Path
from tempfile import NamedTemporaryFile
import traceback
import re

from services.ocr_service import OCRExecutionError, OCRProviderUnavailableError, OCRResult


class PaddleOCRProvider:
    name = "paddle"

    def __init__(self):
        try:
            from paddleocr import PaddleOCR
        except ImportError as exc:
            raise OCRProviderUnavailableError(
                "PaddleOCR를 사용할 수 없습니다. `pip install paddleocr paddlepaddle`로 설치해주세요."
            ) from exc

        self._ocr = self._build_ocr(PaddleOCR)
        self._debug("PaddleOCR provider initialized")

    def _build_ocr(self, paddle_ocr_cls):
        base_kwargs = {
            "use_angle_cls": True,
            "lang": "korean",
        }

        try:
            self._debug("Trying PaddleOCR(..., show_log=False)")
            return paddle_ocr_cls(**base_kwargs, show_log=False)
        except (TypeError, ValueError) as exc:
            if "show_log" not in str(exc):
                raise
            self._debug("show_log is not supported in this PaddleOCR version, retrying without it")
            return paddle_ocr_cls(**base_kwargs)

    def extract(self, image_bytes: bytes, filename: str) -> OCRResult:
        suffix = Path(filename).suffix or ".png"
        temp_path = None

        try:
            self._debug(f"extract start filename={filename} size={len(image_bytes)}")
            with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(image_bytes)
                temp_path = Path(temp_file.name)
                self._debug(f"temporary file created path={temp_path}")

            result = self._run_ocr(str(temp_path))
            self._debug(
                f"raw result type={type(result).__name__} preview={self._safe_preview(result)}"
            )

            extracted_items = self._extract_items(result)
            lines = [text for text, _ in extracted_items if text]
            confidences = [confidence for _, confidence in extracted_items]
            self._debug(
                f"normalized line_count={len(lines)} confidence_count={len(confidences)}"
            )

            if not lines:
                raise OCRExecutionError("PaddleOCR에서 텍스트를 추출하지 못했습니다.")

            raw_text = "\n".join(lines)
            average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            self._debug(
                f"extract success avg_confidence={average_confidence:.4f} raw_text_len={len(raw_text)}"
            )
            return OCRResult(
                raw_text=raw_text,
                lines=lines,
                average_confidence=average_confidence,
                provider_name=self.name,
            )
        except OCRExecutionError:
            self._debug("OCRExecutionError raised inside PaddleOCRProvider")
            traceback.print_exc()
            raise
        except Exception as exc:
            self._debug(f"unexpected PaddleOCR error: {exc}")
            traceback.print_exc()
            raise OCRExecutionError(f"PaddleOCR 처리 중 오류가 발생했습니다: {exc}") from exc
        finally:
            if temp_path and temp_path.exists():
                temp_path.unlink(missing_ok=True)
                self._debug(f"temporary file removed path={temp_path}")

    def _run_ocr(self, image_path: str):
        try:
            self._debug(f"running self._ocr.ocr(path, cls=True) path={image_path}")
            return self._ocr.ocr(image_path, cls=True)
        except TypeError as exc:
            if "cls" not in str(exc):
                raise
            self._debug("cls argument is not supported, retrying without cls")
            return self._ocr.ocr(image_path)

    def _extract_items(self, node) -> list[tuple[str, float]]:
        if node is None:
            return []

        if hasattr(node, "rec_texts"):
            texts = getattr(node, "rec_texts", None) or []
            scores = getattr(node, "rec_scores", None) or []
            return self._pair_texts_and_scores(texts, scores)

        if isinstance(node, dict):
            direct = self._extract_from_dict(node)
            if direct:
                return direct
            items: list[tuple[str, float]] = []
            for key, value in node.items():
                if not self._should_recurse_dict_key(key):
                    continue
                items.extend(self._extract_items(value))
            return items

        if isinstance(node, str):
            return []

        if isinstance(node, (list, tuple)):
            direct_item = self._extract_direct_sequence(node)
            if direct_item is not None:
                return [direct_item]

            items: list[tuple[str, float]] = []
            for child in node:
                items.extend(self._extract_items(child))
            return items

        text_attr = self._extract_text_attr(node)
        if text_attr is not None:
            return text_attr

        return []

    def _extract_from_dict(self, value: dict) -> list[tuple[str, float]]:
        text_keys = ["text", "rec_text", "ocr_text", "transcription"]
        score_keys = ["score", "confidence", "rec_score"]

        for text_key in text_keys:
            text_value = value.get(text_key)
            if isinstance(text_value, str) and text_value.strip():
                cleaned_text = self._normalize_candidate_text(text_value)
                if not cleaned_text:
                    return []
                confidence = 0.0
                for score_key in score_keys:
                    if score_key in value:
                        confidence = self._to_float(value.get(score_key))
                        break
                return [(cleaned_text, confidence)]

        if isinstance(value.get("texts"), list):
            return self._pair_texts_and_scores(value.get("texts") or [], value.get("scores") or [])

        return []

    def _extract_direct_sequence(self, value) -> tuple[str, float] | None:
        if not value:
            return None

        if len(value) >= 2 and isinstance(value[1], (list, tuple)):
            second = value[1]
            if len(second) >= 1 and isinstance(second[0], str):
                text = self._normalize_candidate_text(second[0])
                confidence = self._to_float(second[1]) if len(second) > 1 else 0.0
                return (text, confidence) if text else None

        if isinstance(value[0], str):
            text = self._normalize_candidate_text(value[0])
            if not text:
                return None
            confidence = self._to_float(value[1]) if len(value) > 1 else 0.0
            return (text, confidence)

        if len(value) >= 3 and isinstance(value[1], str):
            text = self._normalize_candidate_text(value[1])
            confidence = self._to_float(value[2])
            return (text, confidence) if text else None

        return None

    def _extract_text_attr(self, node) -> list[tuple[str, float]] | None:
        if hasattr(node, "text"):
            text = getattr(node, "text")
            cleaned_text = self._normalize_candidate_text(text)
            if cleaned_text:
                score = self._to_float(getattr(node, "score", 0.0))
                return [(cleaned_text, score)]

        if hasattr(node, "texts"):
            texts = getattr(node, "texts")
            scores = getattr(node, "scores", None) or []
            if isinstance(texts, list):
                return self._pair_texts_and_scores(texts, scores)

        return None

    def _pair_texts_and_scores(self, texts, scores) -> list[tuple[str, float]]:
        paired: list[tuple[str, float]] = []
        for index, text in enumerate(texts):
            if not isinstance(text, str):
                continue
            cleaned = self._normalize_candidate_text(text)
            if not cleaned:
                continue
            score = self._to_float(scores[index]) if index < len(scores) else 0.0
            paired.append((cleaned, score))
        return paired

    def _should_recurse_dict_key(self, key) -> bool:
        if not isinstance(key, str):
            return False
        allowed_keys = {
            "res",
            "result",
            "results",
            "ocr_res",
            "ocr_result",
            "rec_texts",
            "rec_scores",
            "texts",
            "scores",
            "data",
            "items",
            "pages",
            "children",
        }
        return key in allowed_keys

    def _normalize_candidate_text(self, value) -> str:
        if not isinstance(value, str):
            return ""

        cleaned = value.strip()
        if not cleaned:
            return ""

        lower = cleaned.lower()
        if self._looks_like_path(lower):
            self._debug(f"dropped path-like text={cleaned}")
            return ""

        if lower in {"general", "ocr", "result", "input_path", "page", "res"}:
            self._debug(f"dropped metadata text={cleaned}")
            return ""

        if re.fullmatch(r"[\[\]\(\)\{\},.\-_/\\:;#\s]+", cleaned):
            return ""

        return cleaned

    def _looks_like_path(self, value: str) -> bool:
        if re.match(r"^[a-z]:\\", value):
            return True
        if "\\users\\" in value or "/tmp/" in value or "\\temp\\" in value:
            return True
        if value.endswith((".png", ".jpg", ".jpeg", ".webp", ".pdf")):
            return True
        return False

    def _to_float(self, value) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    def _safe_preview(self, value) -> str:
        preview = repr(value)
        return preview[:500]

    def _debug(self, message: str) -> None:
        print(f"[PaddleOCRProvider] {message}", flush=True)
