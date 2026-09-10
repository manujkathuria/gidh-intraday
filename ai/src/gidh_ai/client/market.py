from __future__ import annotations

import json
import os
from collections.abc import Callable
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from gidh_ai.models import DailyFeature, IntradayFeature, PublishedSession

Transport = Callable[[str], list[dict[str, Any]]]


class MarketClientError(RuntimeError):
    pass


class MarketClient:
    def __init__(self, base_url: str, transport: Transport | None = None) -> None:
        self._base_url = base_url.rstrip("/")
        self._transport = transport or self._get_json

    @classmethod
    def from_environment(cls) -> "MarketClient":
        return cls(os.getenv("GIDH_API_URL", "http://127.0.0.1:8080"))

    def sessions(self) -> list[PublishedSession]:
        return [PublishedSession.from_api(item) for item in self._transport("/v1/market/sessions")]

    def daily_features(self, session_date: str) -> list[DailyFeature]:
        return [DailyFeature.from_api(item) for item in self._transport(self._path("/v1/market/daily-features", session_date=session_date))]

    def intraday_features(self, session_date: str, symbol: str, limit: int = 390) -> list[IntradayFeature]:
        if not 1 <= limit <= 500:
            raise ValueError("limit must be between 1 and 500")
        return [IntradayFeature.from_api(item) for item in self._transport(self._path("/v1/market/intraday-features", session_date=session_date, symbol=symbol, limit=limit))]

    def _path(self, path: str, **query: object) -> str:
        return f"{path}?{urlencode(query)}"

    def _get_json(self, path: str) -> list[dict[str, Any]]:
        try:
            with urlopen(f"{self._base_url}{path}", timeout=10) as response:
                payload = json.load(response)
        except (HTTPError, URLError, TimeoutError) as error:
            raise MarketClientError(f"market API request failed: {error}") from error
        if not isinstance(payload, list):
            raise MarketClientError("market API returned an unexpected response")
        return payload
