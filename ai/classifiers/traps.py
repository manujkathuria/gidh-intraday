"""
Traps & Manipulation Feint Classifier
Classifies Bull Traps (Gap & Crap), Bear Traps (Flush & Squeeze), and Sector Divergence Feints.
"""

import pandas as pd
from typing import List
from ai.classifiers.base import BaseClassifier, AlphaSignal

class TrapClassifier(BaseClassifier):
    def classify(self, df: pd.DataFrame, **kwargs) -> List[AlphaSignal]:
        signals = []
        if df.empty:
            return signals

        # Sector average lookup
        sec_map = df.groupby('sector')['move_pct'].mean().to_dict()

        for _, row in df.iterrows():
            sym = row['symbol']
            sec = row['sector']
            gap = row['gap_pct']
            move = row['move_pct']
            rvol = row['rvol']
            clv = row['clv']
            dist_vwap = row['vwap_dist_pct']
            sec_avg = sec_map.get(sec, 0.0)

            # 1. Bull Trap / Gap & Crap
            if gap >= 1.2 and dist_vwap < 0 and clv <= 0.25:
                signals.append(AlphaSignal(
                    symbol=sym,
                    sector=sec,
                    signal_name="BULL_TRAP (Gap & Crap)",
                    direction="BEARISH",
                    confidence="HIGH" if rvol >= 3.0 else "MEDIUM",
                    rationale=f"Gapped +{gap}% but collapsed below VWAP (CLV: {clv}). Trapped early morning buyers.",
                    move_pct=move,
                    gap_pct=gap,
                    rvol=rvol,
                    clv=clv
                ))

            # 2. Bear Trap / Flush & Squeeze
            elif gap <= -1.2 and dist_vwap > 0 and clv >= 0.75:
                signals.append(AlphaSignal(
                    symbol=sym,
                    sector=sec,
                    signal_name="BEAR_TRAP (Flush & Squeeze)",
                    direction="BULLISH",
                    confidence="HIGH" if rvol >= 3.0 else "MEDIUM",
                    rationale=f"Gapped {gap}% but violently reclaimed VWAP (CLV: {clv}). Trapped short sellers.",
                    move_pct=move,
                    gap_pct=gap,
                    rvol=rvol,
                    clv=clv
                ))

            # 3. Sector Divergence Feint
            elif move >= 1.8 and sec_avg <= -0.5:
                signals.append(AlphaSignal(
                    symbol=sym,
                    sector=sec,
                    signal_name="SECTOR_DIVERGENCE_TRAP",
                    direction="AVOID",
                    confidence="MEDIUM",
                    rationale=f"Surging +{move}% while {sec} sector is weak ({sec_avg}%). High exhaustion/fade risk.",
                    move_pct=move,
                    gap_pct=gap,
                    rvol=rvol,
                    clv=clv
                ))

        return signals
