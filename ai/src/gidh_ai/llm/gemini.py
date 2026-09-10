from __future__ import annotations

import json
import os
from collections.abc import Callable
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class GeminiClient:
    def __init__(self, api_key: str, model: str, transport: Callable[[str, dict[str, Any]], dict[str, Any]] | None = None) -> None:
        self._api_key, self.model, self._transport = api_key, model, transport or self._request

    @classmethod
    def from_environment(cls) -> "GeminiClient":
        key = os.getenv("GEMINI_API_KEY")
        model = os.getenv("GEMINI_MODEL")
        if not key or not model:
            raise RuntimeError("GEMINI_API_KEY and GEMINI_MODEL are required for daily-stock-selector")
        return cls(key, model)

    def json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = self._transport(task, payload)
        text = response["candidates"] if "candidates" in response else response["text"]
        if isinstance(text, dict):
            return text
        return json.loads(str(text).removeprefix("```json").removesuffix("```").strip())

    def _request(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        prompt = f"""You are Gidh's intraday research partner. {task}
Use only the supplied evidence. Do not infer future data, fabricate facts, issue trade orders, or choose symbols absent from the payload. Return JSON only.\n\n{json.dumps(payload, default=str, separators=(',', ':'))}"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?{urlencode({'key': self._api_key})}"
        request = Request(url, data=json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}}).encode(), headers={"Content-Type": "application/json"})
        with urlopen(request, timeout=90) as response:
            body = json.load(response)
        return {"text": body["candidates"][0]["content"]["parts"][0]["text"]}
