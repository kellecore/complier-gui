import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

# Load .env file if it exists (for API keys)
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

import httpx
from openai import OpenAI, APIError
from .schemas import WorkerResponse, QualityReport, LLMFixResponse

DEFAULT_PROVIDER = os.environ.get("LLM_PROVIDER", "openai_compatible").lower()

DEFAULT_MODELS = {
    "openai_compatible": os.environ.get("LLM_MODEL_OPENAI_COMPAT", "deepseek-chat"),
    "openai": os.environ.get("LLM_MODEL_OPENAI", "gpt-4o-mini"),
    "anthropic": os.environ.get("LLM_MODEL_ANTHROPIC", "claude-3-5-sonnet-20241022"),
    "gemini": os.environ.get("LLM_MODEL_GEMINI", "gemini-1.5-flash"),
}

DEFAULT_BASE_URLS = {
    "openai_compatible": os.environ.get("OPENAI_BASE_URL", "https://api.deepseek.com/v1"),
    "openai": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    "anthropic": os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1"),
    "gemini": os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com"),
}

# Backward-compat constants expected by existing imports (e.g. hybrid.py)
DEFAULT_MODEL = DEFAULT_MODELS.get(DEFAULT_PROVIDER, "deepseek-chat")
DEFAULT_BASE_URL = DEFAULT_BASE_URLS.get(DEFAULT_PROVIDER, "https://api.deepseek.com/v1")

PROMPTS_DIR = Path(__file__).parent / "prompts"
WORKER_PROMPT_PATH = PROMPTS_DIR / "worker_v1.md"
COACH_PROMPT_PATH = PROMPTS_DIR / "quality_coach.md"

HARD_TIMEOUT_SECONDS = int(os.environ.get("LLM_HARD_TIMEOUT_SECONDS", "45"))
COACH_TIMEOUT_SECONDS = int(os.environ.get("LLM_COACH_TIMEOUT_SECONDS", "30"))


def _normalize_provider(provider: str) -> str:
    p = (provider or "").strip().lower()
    aliases = {
        "openai-compatible": "openai_compatible",
        "openai_compat": "openai_compatible",
        "compat": "openai_compatible",
        "anthropic": "anthropic",
        "claude": "anthropic",
        "gemini": "gemini",
        "google": "gemini",
        "openai": "openai",
    }
    return aliases.get(p, p if p in {"openai_compatible", "openai", "anthropic", "gemini"} else "openai_compatible")


class WorkerClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ):
        self.provider = _normalize_provider(provider or DEFAULT_PROVIDER)
        self.openai_api_key = api_key or os.environ.get("OPENAI_API_KEY") or "missing_key"
        self.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY") or "missing_key"
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY") or "missing_key"

        self.base_url = base_url or DEFAULT_BASE_URLS[self.provider]
        self.model = model or DEFAULT_MODELS[self.provider]

        self.openai_client = OpenAI(
            api_key=self.openai_api_key,
            base_url=self.base_url
            if self.provider in {"openai", "openai_compatible"}
            else DEFAULT_BASE_URLS["openai"],
            timeout=HARD_TIMEOUT_SECONDS,
        )
        self.http = httpx.Client(timeout=HARD_TIMEOUT_SECONDS)

        self.system_prompt = self._load_prompt(WORKER_PROMPT_PATH)
        self.coach_prompt = self._load_prompt(COACH_PROMPT_PATH)
        self.optimizer_prompt = self._load_prompt(PROMPTS_DIR / "optimizer.md")
        self.editor_prompt = self._load_prompt(PROMPTS_DIR / "editor.md")

    def _load_prompt(self, path: Path) -> str:
        if not path.exists():
            return ""
        return path.read_text(encoding="utf-8")

    def _has_provider_key(self) -> bool:
        if self.provider in {"openai", "openai_compatible"}:
            return self.openai_api_key != "missing_key"
        if self.provider == "anthropic":
            return self.anthropic_api_key != "missing_key"
        if self.provider == "gemini":
            return self.gemini_api_key != "missing_key"
        return False

    def _call_openai_like(self, messages: list, max_tokens: int = 1500, json_mode: bool = True) -> str:
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        completion = self.openai_client.chat.completions.create(**kwargs)
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI-compatible provider")
        return content

    def _collapse_messages(self, messages: list) -> tuple[str, str]:
        system_parts = [m.get("content", "") for m in messages if m.get("role") == "system"]
        user_parts = [m.get("content", "") for m in messages if m.get("role") == "user"]
        system_prompt = "\n\n".join([p for p in system_parts if p]).strip()
        user_prompt = "\n\n".join([p for p in user_parts if p]).strip()
        return system_prompt, user_prompt

    def _call_anthropic(self, messages: list, max_tokens: int = 1500, json_mode: bool = True) -> str:
        system_prompt, user_prompt = self._collapse_messages(messages)
        if json_mode:
            system_prompt += (
                "\n\nReturn only valid JSON object. No markdown, no backticks, no extra text."
            )

        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": 0.2,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        url = f"{self.base_url.rstrip('/')}/messages"
        res = self.http.post(
            url,
            headers={
                "x-api-key": self.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        res.raise_for_status()
        data = res.json()
        parts = data.get("content", [])
        content = "\n".join([p.get("text", "") for p in parts if p.get("type") == "text"]).strip()
        if not content:
            raise ValueError("Empty response from Anthropic")
        return content

    def _call_gemini(self, messages: list, max_tokens: int = 1500, json_mode: bool = True) -> str:
        system_prompt, user_prompt = self._collapse_messages(messages)
        if json_mode:
            system_prompt += (
                "\n\nReturn only valid JSON object. No markdown fences. No explanations."
            )

        payload = {
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": max_tokens,
            },
            "systemInstruction": {
                "role": "system",
                "parts": [{"text": system_prompt}],
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
        }
        url = (
            f"{self.base_url.rstrip('/')}/v1beta/models/{self.model}:generateContent"
            f"?key={self.gemini_api_key}"
        )
        res = self.http.post(url, json=payload)
        res.raise_for_status()
        data = res.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        content = "\n".join([p.get("text", "") for p in parts if p.get("text")]).strip()
        if not content:
            raise ValueError("Empty response from Gemini")
        return content

    def _extract_json_block(self, text: str) -> str:
        text = (text or "").strip()
        if not text:
            return text
        if text.startswith("{") and text.endswith("}"):
            return text
        first = text.find("{")
        last = text.rfind("}")
        if first != -1 and last != -1 and last > first:
            return text[first : last + 1]
        return text

    def _call_api(self, messages: list, max_tokens: int = 1500, json_mode: bool = True) -> str:
        print(f"[LLM] provider={self.provider} model={self.model}")
        if not self._has_provider_key():
            raise RuntimeError(
                "API key is missing for selected provider. "
                "Set OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY."
            )

        try:
            if self.provider in {"openai", "openai_compatible"}:
                content = self._call_openai_like(messages, max_tokens=max_tokens, json_mode=json_mode)
            elif self.provider == "anthropic":
                content = self._call_anthropic(messages, max_tokens=max_tokens, json_mode=json_mode)
            elif self.provider == "gemini":
                content = self._call_gemini(messages, max_tokens=max_tokens, json_mode=json_mode)
            else:
                raise RuntimeError(f"Unsupported provider: {self.provider}")

            if json_mode:
                content = self._extract_json_block(content)
            return content
        except Exception as e:
            print(f"[LLM] API call failed: {e}")
            raise

    def process(self, user_text: str, context: Optional[Dict[str, Any]] = None) -> WorkerResponse:
        if not self._has_provider_key():
            raise RuntimeError("API key missing for selected provider.")

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_text},
        ]

        if context:
            ctx_str = "\n".join([f"{k}: {v}" for k, v in context.items()])
            messages.insert(1, {"role": "system", "content": f"Context:\n{ctx_str}"})

        with ThreadPoolExecutor(max_workers=3) as executor:
            future = executor.submit(self._call_api, messages, max_tokens=3000)
            try:
                content = future.result(timeout=HARD_TIMEOUT_SECONDS)
            except FuturesTimeoutError:
                future.cancel()
                raise RuntimeError(
                    f"LLM API did not respond within {HARD_TIMEOUT_SECONDS} seconds."
                )
            except APIError as e:
                raise RuntimeError(f"LLM API failed: {e}") from e
            except Exception as e:
                raise RuntimeError(f"LLM error: {e}") from e

        response = WorkerResponse.model_validate_json(content)

        if not response.optimized_content or len(response.optimized_content) < 50:
            parts = []
            if response.system_prompt:
                parts.append(response.system_prompt)
            if response.user_prompt:
                parts.append(response.user_prompt)
            if response.plan:
                parts.append(response.plan)
            response.optimized_content = "\n\n---\n\n".join(parts)

        return response

    def analyze_prompt(self, user_text: str) -> QualityReport:
        if not self._has_provider_key():
            raise RuntimeError("API key missing for selected provider.")

        if not self.coach_prompt:
            raise RuntimeError("Quality Coach prompt not found.")

        messages = [
            {"role": "system", "content": self.coach_prompt},
            {"role": "user", "content": f"Analyze this prompt:\n\n{user_text}"},
        ]

        with ThreadPoolExecutor(max_workers=3) as executor:
            future = executor.submit(self._call_api, messages, 1024)
            try:
                content = future.result(timeout=COACH_TIMEOUT_SECONDS)
            except FuturesTimeoutError:
                future.cancel()
                raise RuntimeError(f"Quality analysis timed out after {COACH_TIMEOUT_SECONDS}s.")
            except Exception as e:
                raise RuntimeError(f"Quality analysis error: {e}") from e

        return QualityReport.model_validate_json(content)

    def optimize_prompt(self, user_text: str, max_tokens: int = None, max_chars: int = None) -> str:
        if not self._has_provider_key():
            raise RuntimeError("API key missing for selected provider.")

        if not self.optimizer_prompt:
            self.optimizer_prompt = (
                "You are a specialized Prompt Optimizer. Your goal is to reduce token usage by "
                "at least 20% while preserving exact intent and constraints. Return only optimized text."
            )

        sys_prompt = self.optimizer_prompt
        constraints = []
        if max_tokens:
            constraints.append(f"TARGET: Strict maximum of {max_tokens} tokens.")
        if max_chars:
            constraints.append(f"TARGET: Strict maximum of {max_chars} characters.")
        if constraints:
            sys_prompt += "\n\n" + "\n".join(constraints)

        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": f"Optimize this prompt:\n\n{user_text}"},
        ]

        with ThreadPoolExecutor(max_workers=3) as executor:
            future = executor.submit(self._call_api, messages, 2048, json_mode=False)
            try:
                content = future.result(timeout=COACH_TIMEOUT_SECONDS)
                return content.strip()
            except FuturesTimeoutError:
                future.cancel()
                raise RuntimeError(f"Optimization timed out after {COACH_TIMEOUT_SECONDS}s.")
            except Exception as e:
                raise RuntimeError(f"Optimization error: {e}") from e

    def fix_prompt(self, user_text: str) -> LLMFixResponse:
        if not self._has_provider_key():
            raise RuntimeError("API key missing for selected provider.")

        if not self.editor_prompt:
            self.editor_prompt = (
                "You are an expert editor. Rewrite this prompt to be better. "
                "Return JSON: {fixed_text, explanation, changes}"
            )

        messages = [
            {"role": "system", "content": self.editor_prompt},
            {"role": "user", "content": f"Fix this prompt:\n\n{user_text}"},
        ]

        with ThreadPoolExecutor(max_workers=3) as executor:
            future = executor.submit(self._call_api, messages, 1500)
            try:
                content = future.result(timeout=COACH_TIMEOUT_SECONDS)
            except FuturesTimeoutError:
                future.cancel()
                raise RuntimeError(f"Auto-fix timed out after {COACH_TIMEOUT_SECONDS}s.")
            except Exception as e:
                raise RuntimeError(f"Auto-fix error: {e}") from e

        return LLMFixResponse.model_validate_json(content)
