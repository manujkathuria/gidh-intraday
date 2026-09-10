import unittest

from gidh_ai.research.directional_pool import build_directional_pool


def row(index: int) -> dict[str, object]:
    close = 100 + index
    return {"instrument_id": index, "symbol": f"S{index:02d}", "prior_close": close, "prior_high": close + index % 7 + 1,
            "prior_low": close - index % 5 - 1, "cpr_pivot": close - 1, "atr_14": 1 + index / 10,
            "return_5d_pct": index - 20, "return_20d_pct": 20 - index / 2,
            "distance_20d_high_pct": index % 9, "distance_20d_low_pct": (40 - index) % 9,
            "futures_oi_change_5d_pct": (-1) ** index * index}


class DirectionalPoolTest(unittest.TestCase):
    def test_returns_unique_cards_with_only_published_metrics(self) -> None:
        pool = build_directional_pool([row(index) for index in range(40)])
        self.assertEqual(35, len(pool))
        self.assertEqual(35, len({card["symbol"] for card in pool}))
        self.assertTrue({card["lane"] for card in pool}.issubset({"EXPANSION", "DIRECTIONAL_CONTEXT", "EXTREME", "BREADTH"}))

    def test_rejects_invalid_limit(self) -> None:
        with self.assertRaises(ValueError):
            build_directional_pool([row(1)], 0)
