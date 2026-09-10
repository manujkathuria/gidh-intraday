from __future__ import annotations

import json
import os
import sys
from time import monotonic
from typing import Any

from google import genai
from google.genai import types


class GeminiClient:
    def __init__(self, api_key: str, model: str) -> None:
        self.model = model.removeprefix("models/")
        self._client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=25_000))

    @classmethod
    def from_environment(cls) -> "GeminiClient":
        key, model = os.getenv("GEMINI_API_KEY"), os.getenv("GEMINI_MODEL")
        if not key or not model:
            raise RuntimeError("GEMINI_API_KEY and GEMINI_MODEL are required for daily-stock-selector")
        return cls(key, model)

    def json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        prompt = f"You are Gidh's intraday research partner. {task}\nUse only supplied evidence; do not infer future data, fabricate facts, issue trade orders, or choose symbols absent from the payload.\n\n{json.dumps(payload, default=str, separators=(',', ':'))}"
        started = monotonic()
        print(f"[gemini] request started ({self.model})", file=sys.stderr, flush=True)
        try:
            response = self._client.models.generate_content(model=self.model, contents=prompt, config=types.GenerateContentConfig(response_mime_type="application/json"))
        except Exception as error:
            print(f"[gemini] request failed in {monotonic() - started:.1f}s: {type(error).__name__}: {error}", file=sys.stderr, flush=True)
            raise
        print(f"[gemini] request completed in {monotonic() - started:.1f}s", file=sys.stderr, flush=True)
        if not response.text:
            raise RuntimeError("Gemini returned no structured response")
        return json.loads(response.text)
