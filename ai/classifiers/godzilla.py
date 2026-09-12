"""
Godzilla & Extreme Relative Volume Classifier (>10x RVOL)
"""

import pandas as pd
from typing import List
from ai.classifiers.base import BaseClassifier, AlphaSignal

class GodzillaClassifier(BaseClassifier):
    def classify(self, df: pd.DataFrame, **kwargs) -> List[AlphaSignal]:
        signals = []
        if df.empty:
            return signals

        for _, row in df.iterrows():
            rvol = row['rvol']
            dist_vwap = row['vwap_dist_pct']
            clv = row['clv']
            move = row['move_pct']
            gap = row['gap_pct']

            # Godzilla Long: RVOL > 8x, Holding Above VWAP, Solid CLV
            if rvol >= 8.0 and dist_vwap > 0 and clv >= 0.60:
                signals.append(AlphaSignal(
                    symbol=row['symbol'],
                    sector=row['sector'],
                    signal_name="GODZILLA_RVOL_LONG",
                    direction="BULLISH",
                    confidence="HIGH" if rvol >= 15.0 else "MEDIUM",
                    rationale=f"Heavy institutional mining ({rvol}x RVOL) holding above VWAP (+{dist_vwap}%) with CLV {clv}.",
                    move_pct=move,
                    gap_pct=gap,
                    rvol=rvol,
                    clv=clv
                ))
            # Godzilla Short: RVOL > 6x, Collapsing Below VWAP, Dead-Low CLV
            elif rvol >= 6.0 and dist_vwap < 0 and clv <= 0.25:
                signals.append(AlphaSignal(
                    symbol=row['symbol'],
                    sector=row['sector'],
                    signal_name="GODZILLA_RVOL_SHORT",
                    direction="BEARISH",
                    confidence="HIGH" if rvol >= 12.0 else "MEDIUM",
                    rationale=f"Massive liquidation volume ({rvol}x RVOL) pinned below VWAP ({dist_vwap}%) with CLV {clv}.",
                    move_pct=move,
                    gap_pct=gap,
                    rvol=rvol,
                    clv=clv
                ))

        return signals
