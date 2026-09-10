from __future__ import annotations

from collections.abc import Callable
from typing import Any


POOL_POLICY_VERSION = "directional-pool-v1"


def build_directional_pool(rows: list[dict[str, object]], limit: int = 35) -> list[dict[str, object]]:
    """Create an auditable, direction-neutral research pool from published facts."""
    if limit < 1:
        raise ValueError("limit must be positive")
    if not rows:
        return []

    enriched = [dict(row) for row in rows]
    metrics: dict[str, Callable[[dict[str, object]], float]] = {
        "atr_pct": lambda row: _number(row, "atr_14") / _positive(row, "prior_close") * 100,
        "prior_range_pct": lambda row: (_number(row, "prior_high") - _number(row, "prior_low")) / _positive(row, "prior_close") * 100,
        "absolute_oi_change": lambda row: abs(_number(row, "futures_oi_change_5d_pct")),
        "absolute_return_5d": lambda row: abs(_number(row, "return_5d_pct")),
        "absolute_return_20d": lambda row: abs(_number(row, "return_20d_pct")),
        "absolute_cpr_distance": lambda row: abs((_number(row, "prior_close") - _number(row, "cpr_pivot")) / _positive(row, "prior_close") * 100),
        "near_20d_extreme": lambda row: -min(abs(_number(row, "distance_20d_high_pct")), abs(_number(row, "distance_20d_low_pct"))),
    }
    values = {name: [metric(row) for row in enriched] for name, metric in metrics.items()}
    ranks = {name: _percentiles(series) for name, series in values.items()}
    for index, row in enumerate(enriched):
        row["_expansion_score"] = ranks["atr_pct"][index] * 0.45 + ranks["prior_range_pct"][index] * 0.40 + ranks["absolute_oi_change"][index] * 0.15
        row["_context_score"] = ranks["absolute_return_5d"][index] * 0.40 + ranks["absolute_return_20d"][index] * 0.35 + ranks["absolute_cpr_distance"][index] * 0.25
        row["_extreme_score"] = ranks["near_20d_extreme"][index] * 0.60 + ranks["atr_pct"][index] * 0.25 + ranks["absolute_oi_change"][index] * 0.15

    lanes = (("EXPANSION", "_expansion_score", 12), ("DIRECTIONAL_CONTEXT", "_context_score", 12), ("EXTREME", "_extreme_score", 11))
    chosen: dict[str, tuple[str, float]] = {}
    for lane, score_key, quota in lanes:
        for row in sorted(enriched, key=lambda item: (-float(item[score_key]), str(item["symbol"])))[:quota]:
            symbol = str(row["symbol"])
            score = float(row[score_key])
            previous = chosen.get(symbol)
            if previous is None or score > previous[1]:
                chosen[symbol] = (lane, score)

    remaining = sorted(enriched, key=lambda row: (-max(float(row["_expansion_score"]), float(row["_context_score"]), float(row["_extreme_score"])), str(row["symbol"])))
    for row in remaining:
        if len(chosen) >= limit:
            break
        symbol = str(row["symbol"])
        chosen.setdefault(symbol, ("BREADTH", max(float(row["_expansion_score"]), float(row["_context_score"]), float(row["_extreme_score"]))))

    by_symbol = {str(row["symbol"]): row for row in enriched}
    return [_card(by_symbol[symbol], lane, score) for symbol, (lane, score) in sorted(chosen.items(), key=lambda item: (-item[1][1], item[0]))[:limit]]


def _card(row: dict[str, object], lane: str, score: float) -> dict[str, object]:
    close = _positive(row, "prior_close")
    return {
        "instrument_id": int(row["instrument_id"]), "symbol": str(row["symbol"]), "lane": lane,
        "pool_score": round(score, 6), "prior_close": float(close),
        "atr_pct": round(_number(row, "atr_14") / close * 100, 4),
        "prior_range_pct": round((_number(row, "prior_high") - _number(row, "prior_low")) / close * 100, 4),
        "return_5d_pct": float(_number(row, "return_5d_pct")), "return_20d_pct": float(_number(row, "return_20d_pct")),
        "close_vs_cpr_pct": round((_number(row, "prior_close") - _number(row, "cpr_pivot")) / close * 100, 4),
        "distance_20d_high_pct": float(_number(row, "distance_20d_high_pct")), "distance_20d_low_pct": float(_number(row, "distance_20d_low_pct")),
        "futures_oi_change_5d_pct": float(_number(row, "futures_oi_change_5d_pct")),
    }


def _number(row: dict[str, object], key: str) -> float:
    value = row.get(key)
    return float(value) if value is not None else 0.0


def _positive(row: dict[str, object], key: str) -> float:
    value = _number(row, key)
    if value <= 0:
        raise ValueError(f"{key} must be positive")
    return value


def _percentiles(values: list[float]) -> list[float]:
    ordered = sorted(range(len(values)), key=lambda index: values[index])
    denominator = max(len(values) - 1, 1)
    result = [0.0] * len(values)
    for rank, index in enumerate(ordered):
        result[index] = rank / denominator
    return result
