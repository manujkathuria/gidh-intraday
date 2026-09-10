from __future__ import annotations

import unittest

from gidh_ai.research.daily_stock_selector import inception


class FakeModel:
    model = "fake"
    def __init__(self) -> None: self.calls = 0
    def json(self, _task: str, payload: dict[str, object]) -> dict[str, object]:
        self.calls += 1
        stocks = payload["stocks"]
        return {"candidates": [{"symbol": stock["symbol"]} for stock in stocks[:7]]}


class DailyStockSelectorTest(unittest.TestCase):
    def test_inception_uses_small_batches_and_returns_only_known_symbols(self) -> None:
        rows = [{"instrument_id": number, "symbol": f"S{number}", "prior_close": 100, "atr_14": number, "return_5d_pct": 0, "return_20d_pct": 0, "average_daily_volume_20": 1_000_000, "volume_dryup_ratio": 1} for number in range(1, 71)]
        model = FakeModel()
        result = inception(rows, model, model, shortlist_size=5, batch_size=35)
        self.assertEqual(len(result.candidates), 5)
        self.assertEqual(model.calls, 5)
        self.assertTrue(all(candidate.symbol in {row["symbol"] for row in rows} for candidate in result.candidates))
