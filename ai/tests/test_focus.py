from __future__ import annotations

import unittest

from gidh_ai.research.focus import rank_daily_focus


class FocusTest(unittest.TestCase):
    def test_ranks_by_volatility_and_liquidity_without_direction(self) -> None:
        candidates = rank_daily_focus([
            {"instrument_id": 1, "symbol": "QUIET", "prior_close": 100, "atr_14": 1, "average_daily_volume_20": 1_000_000, "return_5d_pct": 1, "return_20d_pct": 2},
            {"instrument_id": 2, "symbol": "ACTIVE", "prior_close": 100, "atr_14": 3, "average_daily_volume_20": 1_000_000, "return_5d_pct": -1, "return_20d_pct": -2},
        ])
        self.assertEqual([item.symbol for item in candidates], ["ACTIVE", "QUIET"])
        self.assertEqual(candidates[0].rank, 1)
