from io import BytesIO

import numpy as np
from PIL import Image

from services.ocr_service import OCRExecutionError, OCRProviderUnavailableError, OCRResult


class EasyOCRProvider:
    name = "easyocr"

    def __init__(self):
        try:
            import easyocr
        except ImportError as exc:
            raise OCRProviderUnavailableError(
                "EasyOCR를 사용할 수 없습니다. `pip install easyocr`로 설치해주세요."
            ) from exc

        self._reader = easyocr.Reader(["ko", "en"], gpu=False)

    def extract(self, image_bytes: bytes, filename: str) -> OCRResult:
        try:
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
            results = self._reader.readtext(np.array(image), detail=1, paragraph=False)
            lines: list[str] = []
            confidences: list[float] = []

            for item in results:
                if len(item) < 3:
                    continue
                text = str(item[1]).strip()
                confidence = float(item[2])
                if text:
                    lines.append(text)
                    confidences.append(confidence)

            if not lines:
                raise OCRExecutionError("EasyOCR에서 텍스트를 추출하지 못했습니다.")

            raw_text = "\n".join(lines)
            average_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            return OCRResult(
                raw_text=raw_text,
                lines=lines,
                average_confidence=average_confidence,
                provider_name=self.name,
            )
        except OCRExecutionError:
            raise
        except Exception as exc:
            raise OCRExecutionError(f"EasyOCR 처리 중 오류가 발생했습니다: {exc}") from exc
