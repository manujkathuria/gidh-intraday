from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


POLICY_VERSION = "directional-gemini-v1"


class ResearchModel(Protocol):
    model: str

    def json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]: ...


@dataclass(frozen=True)
class DirectionalDecision:
    instrument_id: int
    symbol: str
    rank: int
    side: str
    confidence: float
    thesis: str
    invalidation: str
    hypothesis_family: str


def select(cards: list[dict[str, object]], model: ResearchModel, limit: int = 15) -> list[DirectionalDecision]:
    if len(cards) < limit:
        raise ValueError("candidate pool is smaller than the selection limit")
    allowed = {str(card["symbol"]): card for card in cards}
    output = model.json(
        "Select exactly 15 directional candidates. Return JSON {decisions:[{symbol,side,confidence,thesis,invalidation,hypothesis_family}]}. "
        "side must be LONG or SHORT. Use only supplied facts. Do not give orders. Seek potential top gainers and losers from 09:30 to close, not merely volatile names. "
        "Keep thesis and invalidation under 16 words each.",
        {"selection_limit": limit, "cards": [_model_card(card) for card in cards]},
    )
    decisions = output.get("decisions")
    if not isinstance(decisions, list) or len(decisions) != limit:
        raise ValueError(f"model must return exactly {limit} decisions")
    result: list[DirectionalDecision] = []
    seen: set[str] = set()
    for rank, item in enumerate(decisions, 1):
        if not isinstance(item, dict):
            raise ValueError("decision must be an object")
        symbol, side = str(item.get("symbol", "")), str(item.get("side", ""))
        if symbol not in allowed or symbol in seen or side not in {"LONG", "SHORT"}:
            raise ValueError("model returned an invalid, duplicate, or unpooled decision")
        confidence = float(item.get("confidence", 0))
        if not 0 <= confidence <= 1:
            raise ValueError("confidence must be between zero and one")
        thesis, invalidation = str(item.get("thesis", "")).strip(), str(item.get("invalidation", "")).strip()
        if not thesis or not invalidation:
            raise ValueError("every decision needs a thesis and invalidation")
        seen.add(symbol)
        result.append(DirectionalDecision(int(allowed[symbol]["instrument_id"]), symbol, rank, side, confidence, thesis, invalidation, str(item.get("hypothesis_family", "UNCLASSIFIED"))))
    if len({item.side for item in result}) < 2:
        raise ValueError("selection must include both LONG and SHORT candidates")
    return result


def _model_card(card: dict[str, object]) -> dict[str, object]:
    fields = ("symbol", "instrument_id", "lane", "pool_score", "atr_pct", "prior_range_pct", "return_5d_pct", "return_20d_pct", "close_vs_cpr_pct", "futures_oi_change_5d_pct")
    return {field: card[field] for field in fields}
