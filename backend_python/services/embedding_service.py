from dataclasses import dataclass
from typing import Any

import httpx

from core.model_settings import EmbeddingStageSettings


@dataclass(slots=True)
class EmbeddingVector:
    values: list[float]
    provider_name: str
    model_name: str


class EmbeddingProviderUnavailableError(RuntimeError):
    pass


class EmbeddingProvider:
    name = "base"

    def embed(self, text: str) -> EmbeddingVector:
        raise NotImplementedError


class DisabledEmbeddingProvider(EmbeddingProvider):
    name = "disabled"

    def embed(self, text: str) -> EmbeddingVector:
        raise EmbeddingProviderUnavailableError(
            "Embedding stage is disabled. Set EMBEDDING_PROVIDER to activate it."
        )


class OpenAPIEmbeddingProvider(EmbeddingProvider):
    name = "openapi"

    def __init__(self, settings: EmbeddingStageSettings):
        self.settings = settings

    def embed(self, text: str) -> EmbeddingVector:
        if not self.settings.api_url:
            raise EmbeddingProviderUnavailableError(
                "EMBEDDING_API_URL or OPEN_API_URL is required for the openapi embedding provider."
            )

        payload = {
            "input": text,
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
            raise EmbeddingProviderUnavailableError(
                f"Embedding API request failed: {exc}"
            ) from exc
        except ValueError as exc:
            raise EmbeddingProviderUnavailableError(
                "Embedding API did not return valid JSON."
            ) from exc

        values = _parse_embedding_values(response_json)
        if not values:
            raise EmbeddingProviderUnavailableError(
                "Embedding API response did not contain a usable vector."
            )

        return EmbeddingVector(
            values=values,
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


class EmbeddingService:
    def __init__(self, provider: EmbeddingProvider):
        self.provider = provider

    def embed(self, text: str) -> EmbeddingVector:
        return self.provider.embed(text)


def build_embedding_service(settings: EmbeddingStageSettings) -> EmbeddingService:
    # disabled는 "아직 사용하지 않음" 상태로 남겨둔다.
    if settings.provider in {"", "disabled", "none"}:
        return EmbeddingService(DisabledEmbeddingProvider())

    # openapi는 외부 API 기반 embedding provider의 기본 선택값이다.
    if settings.provider in {"openapi", "openai", "api"}:
        return EmbeddingService(OpenAPIEmbeddingProvider(settings))

    raise EmbeddingProviderUnavailableError(
        f"Unsupported embedding provider: {settings.provider}"
    )


def _parse_embedding_values(payload: dict[str, Any]) -> list[float]:
    # 응답 포맷이 다를 수 있어 대표적인 키를 순서대로 본다.
    if isinstance(payload.get("embedding"), list):
        return _to_float_list(payload["embedding"])

    if isinstance(payload.get("vector"), list):
        return _to_float_list(payload["vector"])

    data = payload.get("data")
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            if isinstance(first.get("embedding"), list):
                return _to_float_list(first["embedding"])
            if isinstance(first.get("vector"), list):
                return _to_float_list(first["vector"])

    return []


def _to_float_list(values: list[Any]) -> list[float]:
    normalized: list[float] = []
    for value in values:
        try:
            normalized.append(float(value))
        except (TypeError, ValueError):
            continue
    return normalized
