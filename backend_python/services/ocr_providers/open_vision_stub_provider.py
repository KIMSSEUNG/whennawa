from services.ocr_service import OCRExecutionError


class OpenVisionStubProvider:
    name = "open_vision_stub"

    def extract(self, image_bytes: bytes, filename: str):
        raise OCRExecutionError(
            "Open Vision OCR provider는 아직 구현되지 않았습니다. "
            "향후 API 연동용 확장 지점으로만 분리되어 있습니다."
        )
