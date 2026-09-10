from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


POLICY_VERSION = "daily-focus-v1"


@dataclass(frozen=True)
class FocusRationale:
    atr_pct: Decimal
    average_daily_volume_20: int
    return_5d_pct: Decimal
    return_20d_pct: Decimal


@dataclass(frozen=True)
class FocusCandidate:
    instrument_id: int
    symbol: str
    rank: int
    attention_score: Decimal
    rationale: FocusRationale


def rank_daily_focus(rows: list[dict[str, object]], limit: int = 12) -> list[FocusCandidate]:
    """Rank liquid, volatile symbols for attention; this is not a directional signal."""
    if limit < 1:
        raise ValueError("limit must be positive")
    scored: list[tuple[Decimal, dict[str, object], FocusRationale]] = []
    for row in rows:
        prior_close = Decimal(str(row["prior_close"]))
        atr_pct = Decimal(str(row["atr_14"])) / prior_close * 100
        volume = int(row["average_daily_volume_20"])
        rationale = FocusRationale(atr_pct, volume, Decimal(str(row["return_5d_pct"])), Decimal(str(row["return_20d_pct"])))
        score = atr_pct * Decimal(volume).log10()
        scored.append((score, row, rationale))
    scored.sort(key=lambda item: (-item[0], str(item[1]["symbol"])))
    return [FocusCandidate(int(row["instrument_id"]), str(row["symbol"]), rank, score, rationale) for rank, (score, row, rationale) in enumerate(scored[:limit], start=1)]
