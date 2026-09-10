from __future__ import annotations

import json
import os
import sys
from time import monotonic
from typing import Any

from openai import OpenAI


class DeepSeekClient:
    def __init__(self, api_key: str, model: str) -> None:
        self.model = model
        self._client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

    @classmethod
    def from_environment(cls) -> "DeepSeekClient":
        key, model = os.getenv("DEEPSEEK_API_KEY"), os.getenv("DEEPSEEK_MODEL")
        if not key or not model:
            raise RuntimeError("DEEPSEEK_API_KEY and DEEPSEEK_MODEL are required for the selector challenge pass")
        return cls(key, model)

    def json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]:
        started = monotonic()
        print(f"[deepseek] challenge started ({self.model})", file=sys.stderr, flush=True)
        response = self._client.responses.create(model=self.model, instructions="You are Gidh's contrarian intraday research reviewer. Use only supplied evidence and return JSON only.", input=f"{task}\n\n{json.dumps(payload, default=str, separators=(',', ':'))}")
        print(f"[deepseek] challenge completed in {monotonic() - started:.1f}s", file=sys.stderr, flush=True)
        return json.loads(response.output_text)
