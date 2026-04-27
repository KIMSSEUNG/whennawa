import base64
from pathlib import Path
from typing import Any

import httpx

from core.model_settings import OCRApiSettings
from services.ocr_service import OCRExecutionError, OCRProviderUnavailableError, OCRResult


class ApiOCRProvider:
    name = "openapi"

    def __init__(self, settings: OCRApiSettings):
        self.settings = settings

    def extract(self, image_bytes: bytes, filename: str) -> OCRResult:
        if not self.settings.url:
            raise OCRProviderUnavailableError(
                "OCR_API_URL or OPEN_API_URL is required when OCR_PROVIDER=openapi."
            )

        request_json = self._build_request_json(image_bytes=image_bytes, filename=filename)
        headers = self._build_headers()

        try:
            with httpx.Client(timeout=self.settings.timeout_seconds) as client:
                response = client.post(
                    self.settings.url,
                    headers=headers,
                    json=request_json,
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise OCRExecutionError(f"OpenAI OCR request failed: {exc}") from exc

        try:
            response_json = response.json()
        except ValueError as exc:
            raise OCRExecutionError("OpenAI OCR API did not return valid JSON.") from exc

        return self._parse_response_json(response_json)

    def _build_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.settings.api_key:
            # OpenAI API는 Authorization: Bearer <key> 형식을 사용한다.
            headers[self.settings.auth_header] = (
                f"{self.settings.auth_scheme} {self.settings.api_key}".strip()
            )
        return headers

    def _build_request_json(self, image_bytes: bytes, filename: str) -> dict[str, Any]:
        # OpenAI Responses API 기준으로 OCR 전용 프롬프트와 파일 입력을 구성한다.
        return {
            "model": self.settings.model_name,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": self.settings.prompt_text,
                        },
                        self._build_file_part(image_bytes=image_bytes, filename=filename),
                    ],
                }
            ],
        }

    def _build_file_part(self, image_bytes: bytes, filename: str) -> dict[str, Any]:
        mime_type = _guess_mime_type(filename)
        encoded = base64.b64encode(image_bytes).decode("utf-8")

        # 공식 docs 기준:
        # 이미지 -> input_image + image_url(data URL)
        # PDF -> input_file + file_data(data URL)
        if mime_type == "application/pdf":
            return {
                "type": "input_file",
                "filename": Path(filename).name,
                "file_data": f"data:{mime_type};base64,{encoded}",
            }

        return {
            "type": "input_image",
            "image_url": f"data:{mime_type};base64,{encoded}",
        }

    def _parse_response_json(self, payload: dict[str, Any]) -> OCRResult:
        # SDK 예시에서는 response.output_text를 사용한다.
        raw_text = str(payload.get("output_text") or "").strip()

        if not raw_text:
            raw_text = self._extract_text_from_output(payload.get("output"))

        if not raw_text:
            raise OCRExecutionError(
                "OpenAI OCR response did not contain usable text. "
                "Check api_ocr_provider.py::_parse_response_json for your response shape."
            )

        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        return OCRResult(
            raw_text=raw_text,
            lines=lines,
            average_confidence=0.0,
            provider_name=self.name,
        )

    def _extract_text_from_output(self, output_payload: Any) -> str:
        if not isinstance(output_payload, list):
            return ""

        collected: list[str] = []
        for item in output_payload:
            if not isinstance(item, dict):
                continue
            contents = item.get("content")
            if not isinstance(contents, list):
                continue
            for content in contents:
                if not isinstance(content, dict):
                    continue
                if content.get("type") == "output_text":
                    text = str(content.get("text") or "").strip()
                    if text:
                        collected.append(text)
        return "\n".join(collected).strip()


def _guess_mime_type(filename: str) -> str:
    lowered = filename.lower()
    if lowered.endswith(".pdf"):
        return "application/pdf"
    if lowered.endswith(".png"):
        return "image/png"
    if lowered.endswith(".webp"):
        return "image/webp"
    return "image/jpeg"
