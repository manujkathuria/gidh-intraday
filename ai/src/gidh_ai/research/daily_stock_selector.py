from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Protocol

from gidh_ai.research.focus import FocusCandidate, FocusRationale


POLICY_VERSION = "daily-stock-selector-inception-v1"


class ResearchModel(Protocol):
    model: str
    def json(self, task: str, payload: dict[str, Any]) -> dict[str, Any]: ...


@dataclass(frozen=True)
class SelectionResult:
    candidates: list[FocusCandidate]
    provenance: dict[str, Any]


def inception(rows: list[dict[str, object]], model: ResearchModel, challenger: ResearchModel, shortlist_size: int = 15, batch_size: int = 35) -> SelectionResult:
    if not rows or shortlist_size < 1 or batch_size < 1:
        raise ValueError("rows, shortlist_size, and batch_size must be positive")
    universe = {_symbol(row): row for row in rows}
    benchmark = {"median_atr_pct": str(_median([_atr_pct(row) for row in rows])), "universe_size": len(rows)}
    batches = [rows[index:index + batch_size] for index in range(0, len(rows), batch_size)]

    def scout(batch: list[dict[str, object]]) -> tuple[list[str], dict[str, Any]]:
        output = model.json("Nominate at most 7 symbols for a non-directional pre-open WATCH list. Return {\"candidates\":[{\"symbol\":string,\"reason\":string,\"contradiction\":string}]}", {"benchmark": benchmark, "stocks": [_card(row) for row in batch]})
        return _valid_symbols(output, set(_symbol(row) for row in batch), 7), output

    with ThreadPoolExecutor(max_workers=len(batches)) as executor:
        scout_results = list(executor.map(scout, batches))
    nominations = [symbol for symbols, _ in scout_results for symbol in symbols]
    scout_outputs = [output for _, output in scout_results]
    unique = list(dict.fromkeys(nominations))
    consolidated = model.json("Rank the strongest candidates for attention. Return {\"candidates\":[{\"symbol\":string,\"reason\":string}]}.", {"limit": shortlist_size + 8, "stocks": [_card(universe[symbol]) for symbol in unique]})
    finalists = _valid_symbols(consolidated, set(unique), shortlist_size + 8)
    challenge = challenger.json("Challenge this watchlist. Identify weak candidates and any important evidence gaps. Return {\"candidates\":[{\"symbol\":string,\"reason\":string}]}", {"stocks": [_card(universe[symbol]) for symbol in finalists]})
    final = model.json("Publish a non-directional ranked WATCH list. Return {\"candidates\":[{\"symbol\":string,\"reason\":string}]}.", {"limit": shortlist_size, "stocks": [_card(universe[symbol]) for symbol in finalists], "challenge": challenge})
    symbols = _valid_symbols(final, set(finalists), shortlist_size)
    candidates = [_candidate(universe[symbol], rank, len(symbols) - rank + 1) for rank, symbol in enumerate(symbols, 1)]
    return SelectionResult(candidates, {"mode": "inception", "model": model.model, "challenge_model": challenger.model, "benchmark": benchmark, "scouts": scout_outputs, "consolidation": consolidated, "challenge": challenge, "final": final})


def _symbol(row: dict[str, object]) -> str: return str(row["symbol"])
def _atr_pct(row: dict[str, object]) -> Decimal: return Decimal(str(row["atr_14"])) / Decimal(str(row["prior_close"])) * 100
def _median(values: list[Decimal]) -> Decimal: return sorted(values)[len(values) // 2]
def _card(row: dict[str, object]) -> dict[str, object]: return {"symbol": _symbol(row), "atr_pct": str(_atr_pct(row)), "return_5d_pct": row["return_5d_pct"], "return_20d_pct": row["return_20d_pct"], "average_daily_volume_20": row["average_daily_volume_20"], "volume_dryup_ratio": row["volume_dryup_ratio"]}
def _valid_symbols(output: dict[str, Any], allowed: set[str], limit: int) -> list[str]: return [symbol for item in output.get("candidates", []) if (symbol := str(item.get("symbol", ""))) in allowed][:limit]
def _candidate(row: dict[str, object], rank: int, score: int) -> FocusCandidate: return FocusCandidate(int(row["instrument_id"]), _symbol(row), rank, Decimal(score), FocusRationale(_atr_pct(row), int(row["average_daily_volume_20"]), Decimal(str(row["return_5d_pct"])), Decimal(str(row["return_20d_pct"]))))
