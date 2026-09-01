"""The single, tightly-bounded language-model call of the triage pipeline.

Brief 03 §5.3 constrains what may leave the process: the analysis summary, the
questionnaire answers and the retrieved reference text — and NOTHING else. No
farmer name, no phone number, no precise coordinates, no raw photo. The prompt
is assembled in `service/recommendation.py` from those three inputs only; this
module is the transport and knows nothing about cases.

The provider is any OpenAI-compatible chat-completions gateway — OpenRouter by
default, or a self-hosted proxy (e.g. LiteLLM) pointed to via
`OPENROUTER_BASE_URL`. The key is read from configuration at call time and is
never logged. A missing key raises immediately rather than silently
downgrading — a recommendation engine that quietly stops calling the model is
worse than one that fails loudly.
"""
import json
from typing import Optional

import httpx
from loguru import logger

from config.base import settings

PROVIDER_TIMEOUT_SECONDS = 45
DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "anthropic/claude-sonnet-4.5"
# Low but non-zero: the wording should stay natural while the structure and the
# citations must not drift between two runs of the same case.
DEFAULT_TEMPERATURE = 0.2
MAX_OUTPUT_TOKENS = 1600

PROVIDER_NOT_CONFIGURED_MESSAGE = (
    "Layanan AI bahasa belum dikonfigurasi (OPENROUTER_API_KEY kosong)."
)


class LlmProviderError(RuntimeError):
    """Provider unreachable, refused, or returned something unusable."""


class LlmProviderNotConfigured(LlmProviderError):
    """No API key configured — the deployment is incomplete, not degraded."""


class OpenRouterClient:
    """Minimal OpenAI-compatible chat client returning parsed JSON content.

    Named for the default provider; works with any OpenAI-compatible
    chat-completions gateway configured via OPENROUTER_BASE_URL.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> None:
        self._api_key = (
            api_key if api_key is not None else (settings.OPENROUTER_API_KEY or "")
        )
        self._model = model or settings.OPENROUTER_MODEL or DEFAULT_MODEL
        self._base_url = (
            base_url or settings.OPENROUTER_BASE_URL or DEFAULT_BASE_URL
        ).rstrip("/")

    @property
    def provider_version(self) -> str:
        """Recorded per case so an old card can be explained later."""
        return f"openrouter:{self._model}"

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key.strip())

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        """One completion, parsed as a JSON object.

        Raises `LlmProviderError` on transport failure, a non-2xx response, or
        output that is not a JSON object — the caller decides whether to retry
        or fall back, and never receives half-parsed content.
        """
        if not self.is_configured:
            raise LlmProviderNotConfigured(PROVIDER_NOT_CONFIGURED_MESSAGE)

        payload = {
            "model": self._model,
            "temperature": DEFAULT_TEMPERATURE,
            "max_tokens": MAX_OUTPUT_TOKENS,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        try:
            response = httpx.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                timeout=PROVIDER_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            body = response.json()
        except httpx.HTTPStatusError as error:
            # Status only: a response body can echo the prompt back into logs.
            raise LlmProviderError(
                f"provider returned {error.response.status_code}"
            ) from error
        except httpx.HTTPError as error:
            raise LlmProviderError(
                f"provider unreachable: {type(error).__name__}"
            ) from error
        except ValueError as error:
            raise LlmProviderError("provider returned a non-JSON envelope") from error

        return self._parse_content(body)

    @staticmethod
    def _parse_content(body: dict) -> dict:
        choices = (body or {}).get("choices") or []
        if not choices:
            raise LlmProviderError("provider returned no choices")
        content = ((choices[0] or {}).get("message") or {}).get("content") or ""
        try:
            parsed = json.loads(content)
        except (TypeError, ValueError) as error:
            logger.warning("provider content was not valid JSON")
            raise LlmProviderError("provider content was not valid JSON") from error
        if not isinstance(parsed, dict):
            raise LlmProviderError("provider content was not a JSON object")
        return parsed


def resolve_llm_client() -> OpenRouterClient:
    """The configured provider client."""
    return OpenRouterClient()
