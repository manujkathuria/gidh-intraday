from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class JournalEntry:
    """An AI-owned manual outcome record; persistence is intentionally absent."""

    decided_at: datetime
    symbol: str
    direction: str
    thesis: str
    invalidation: str
    outcome_notes: str | None = None

    def __post_init__(self) -> None:
        if self.direction not in {"LONG", "SHORT", "NO_TRADE"}:
            raise ValueError("direction must be LONG, SHORT, or NO_TRADE")
        if not self.symbol.strip() or not self.thesis.strip() or not self.invalidation.strip():
            raise ValueError("symbol, thesis, and invalidation are required")
