from __future__ import annotations

import unittest

from gidh_ai.client import MarketClient


class MarketClientTest(unittest.TestCase):
    def test_daily_features_decode_backend_contract(self) -> None:
        paths: list[str] = []

        def transport(path: str) -> list[dict[str, object]]:
            paths.append(path)
            return [{"symbol": "RELIANCE", "prior_close": 100.0, "cpr_pivot": 101.0, "atr_14": 3.0, "adr_20": 4.0, "return_5d_pct": 1.0, "return_20d_pct": 2.0, "volume_dryup_ratio": 0.8}]

        features = MarketClient("http://example.test", transport).daily_features("2026-09-10")

        self.assertEqual(paths, ["/v1/market/daily-features?session_date=2026-09-10"])
        self.assertEqual(features[0].symbol, "RELIANCE")
        self.assertEqual(features[0].atr_14, 3.0)

    def test_intraday_limit_is_checked_before_request(self) -> None:
        client = MarketClient("http://example.test", lambda _: [])
        with self.assertRaises(ValueError):
            client.intraday_features("2026-09-10", "RELIANCE", limit=501)


if __name__ == "__main__":
    unittest.main()
