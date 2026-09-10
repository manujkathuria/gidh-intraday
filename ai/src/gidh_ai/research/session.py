from __future__ import annotations

from gidh_ai.client import MarketClient


class SessionResearch:
    """Deterministic views of backend facts; policy belongs in a future module."""

    def __init__(self, market: MarketClient) -> None:
        self._market = market

    def sessions(self) -> list[dict[str, object]]:
        return [session.__dict__ for session in self._market.sessions()]

    def daily_snapshot(self, session_date: str) -> list[dict[str, object]]:
        return [feature.__dict__ for feature in self._market.daily_features(session_date)]

    def intraday_replay(self, session_date: str, symbol: str, limit: int = 390) -> list[dict[str, object]]:
        return [feature.__dict__ for feature in self._market.intraday_features(session_date, symbol, limit)]
