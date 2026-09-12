"""
Sector Battalion & Sibling Formation Classifier
Identifies synchronized clan moves and lagging follower breakout candidates.
"""

import pandas as pd
from typing import List
from ai.classifiers.base import BaseClassifier, AlphaSignal

class SectorBattalionClassifier(BaseClassifier):
    def classify(self, df: pd.DataFrame, **kwargs) -> List[AlphaSignal]:
        signals = []
        if df.empty:
            return signals

        # 1. Group sector metrics
        sec_agg = df.groupby('sector').agg(
            civ_count=('symbol', 'count'),
            avg_move=('move_pct', 'mean'),
            pct_above_vwap=('is_above_vwap', lambda s: (s.sum() / len(s) * 100)),
            leaders=('symbol', lambda s: list(s))
        ).reset_index()

        # Find dominant sectors (>75% above VWAP and avg return > +0.75%)
        dominant_bull_sectors = sec_agg[(sec_agg['pct_above_vwap'] >= 75.0) & (sec_agg['avg_move'] >= 0.70) & (sec_agg['civ_count'] >= 3)]

        for _, sec_row in dominant_bull_sectors.iterrows():
            sec_name = sec_row['sector']
            sec_stocks = df[df['sector'] == sec_name].sort_values(by='move_pct', ascending=False)
            
            # Sibling follower: un-extended peer sitting above VWAP
            leader_move = sec_stocks.iloc[0]['move_pct']
            for _, s_row in sec_stocks.iloc[1:4].iterrows():
                if s_row['move_pct'] < (leader_move - 1.0) and s_row['is_above_vwap'] and s_row['clv'] >= 0.60:
                    signals.append(AlphaSignal(
                        symbol=s_row['symbol'],
                        sector=sec_name,
                        signal_name="SECTOR_SIBLING_FOLLOWER",
                        direction="BULLISH",
                        confidence="HIGH",
                        rationale=f"Sector leader {sec_stocks.iloc[0]['symbol']} is +{leader_move}%. Sibling {s_row['symbol']} (+{s_row['move_pct']}%) offers clean follower runway.",
                        move_pct=s_row['move_pct'],
                        gap_pct=s_row['gap_pct'],
                        rvol=s_row['rvol'],
                        clv=s_row['clv']
                    ))

        return signals
