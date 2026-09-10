import unittest

from gidh_ai.research.directional_selector import select


class FakeModel:
    model = "fake"

    def json(self, task, payload):
        return {"decisions": [{"symbol": card["symbol"], "side": "LONG" if index % 2 else "SHORT", "confidence": 0.6, "thesis": "facts align", "invalidation": "facts fail", "hypothesis_family": "TEST"} for index, card in enumerate(payload["cards"][:15])]} 


class DirectionalSelectorTest(unittest.TestCase):
    def test_accepts_exact_unique_pooled_decisions(self):
        cards = [{"instrument_id": index, "symbol": f"S{index}", "lane": "TEST", "pool_score": 0.5,
                  "atr_pct": 1.0, "prior_range_pct": 1.0, "return_5d_pct": 1.0, "return_20d_pct": 1.0,
                  "close_vs_cpr_pct": 1.0, "futures_oi_change_5d_pct": 1.0} for index in range(35)]
        decisions = select(cards, FakeModel())
        self.assertEqual(15, len(decisions))
        self.assertEqual({"LONG", "SHORT"}, {decision.side for decision in decisions})
