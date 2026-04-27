from dataclasses import dataclass
from typing import Any

import httpx

from core.model_settings import LLMStageSettings


@dataclass(slots=True)
class LLMResult:
    text: str
    provider_name: str
    model_name: str


class LLMProviderUnavailableError(RuntimeError):
    pass


class LLMProvider:
    name = "base"

    def generate(self, prompt: str) -> LLMResult:
        raise NotImplementedError


class DisabledLLMProvider(LLMProvider):
    name = "disabled"

    def generate(self, prompt: str) -> LLMResult:
        raise LLMProviderUnavailableError(
            "LLM stage is disabled. Set LLM_PROVIDER to activate it."
        )


class OpenAPILLMProvider(LLMProvider):
    name = "openapi"

    def __init__(self, settings: LLMStageSettings):
        self.settings = settings

    def generate(self, prompt: str) -> LLMResult:
        if not self.settings.api_url:
            raise LLMProviderUnavailableError(
                "LLM_API_URL or OPEN_API_URL is required for the openapi LLM provider."
            )

        payload = {
            "input": prompt,
            "model": self.settings.model_name,
        }
        headers = self._build_headers()

        try:
            with httpx.Client(timeout=self.settings.timeout_seconds) as client:
                response = client.post(
                    self.settings.api_url,
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                response_json = response.json()
        except httpx.HTTPError as exc:
            raise LLMProviderUnavailableError(f"LLM API request failed: {exc}") from exc
        except ValueError as exc:
            raise LLMProviderUnavailableError(
                "LLM API did not return valid JSON."
            ) from exc

        text = _parse_generated_text(response_json)
        if not text:
            raise LLMProviderUnavailableError(
                "LLM API response did not contain usable text."
            )

        return LLMResult(
            text=text,
            provider_name=self.name,
            model_name=self.settings.model_name,
        )

    def _build_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.settings.api_key:
            # OpenAI 호환 API는 Authorization: Bearer <key> 형식을 사용한다.
            headers[self.settings.auth_header] = (
                f"{self.settings.auth_scheme} {self.settings.api_key}".strip()
            )
        return headers


class LLMService:
    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def generate(self, prompt: str) -> LLMResult:
        return self.provider.generate(prompt)


def build_llm_service(settings: LLMStageSettings) -> LLMService:
    # disabled는 "아직 사용하지 않음" 상태로 남겨둔다.
    if settings.provider in {"", "disabled", "none"}:
        return LLMService(DisabledLLMProvider())

    # openapi는 외부 API 기반 LLM provider의 기본 선택값이다.
    if settings.provider in {"openapi", "openai", "api"}:
        return LLMService(OpenAPILLMProvider(settings))

    raise LLMProviderUnavailableError(f"Unsupported LLM provider: {settings.provider}")


def _parse_generated_text(payload: dict[str, Any]) -> str:
    # OpenAI Responses API는 output_text 또는 output[].content[].text에
    # 최종 텍스트를 담는 경우가 많다. 가장 직접적인 필드부터 확인한다.
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    direct_keys = ["text", "output", "content", "result", "message"]
    for key in direct_keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    output = payload.get("output")
    if isinstance(output, list):
        for item in output:
            if not isinstance(item, dict):
                continue

            content = item.get("content")
            if isinstance(content, list):
                for content_item in content:
                    if not isinstance(content_item, dict):
                        continue
                    text = content_item.get("text")
                    if isinstance(text, str) and text.strip():
                        return text.strip()

            text = item.get("text")
            if isinstance(text, str) and text.strip():
                return text.strip()

    choices = payload.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str) and content.strip():
                    return content.strip()
                if isinstance(content, list):
                    for content_item in content:
                        if not isinstance(content_item, dict):
                            continue
                        text = content_item.get("text")
                        if isinstance(text, str) and text.strip():
                            return text.strip()

            text = first.get("text")
            if isinstance(text, str) and text.strip():
                return text.strip()

    data = payload.get("data")
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            for key in direct_keys:
                value = first.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()

    return ""
