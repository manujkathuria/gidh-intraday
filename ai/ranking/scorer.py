"""
Alpha Scoring & Target Synthesis Engine
Aggregates all classifier signals and outputs top ranked picks for the session.
"""

import pandas as pd
from typing import List, Dict
from dataclasses import dataclass, asdict
from ai.classifiers.base import AlphaSignal
from ai.classifiers.godzilla import GodzillaClassifier
from ai.classifiers.sector_battalion import SectorBattalionClassifier
from ai.classifiers.traps import TrapClassifier

@dataclass
class ScoutReport:
    session_date: str
    scout_time: str
    weather_above_vwap_pct: float
    total_civs: int
    signals: List[AlphaSignal]
    top_bulls: List[Dict]
    top_bears: List[Dict]
    top_traps: List[Dict]

def run_scout_synthesis(df: pd.DataFrame, session_date: str, scout_time: str = "09:30:00") -> ScoutReport:
    """
    Runs all classifiers against the scout DataFrame and synthesizes the top high-bounty targets.
    """
    total = len(df)
    above_vwap = int(df['is_above_vwap'].sum()) if not df.empty else 0
    weather_pct = round((above_vwap / total) * 100, 1) if total > 0 else 0.0

    classifiers = [
        GodzillaClassifier(),
        SectorBattalionClassifier(),
        TrapClassifier()
    ]

    all_signals: List[AlphaSignal] = []
    for c in classifiers:
        all_signals.extend(c.classify(df))

    # Deduplicate & rank
    bulls = [asdict(s) for s in all_signals if s.direction == "BULLISH"]
    bears = [asdict(s) for s in all_signals if s.direction == "BEARISH"]
    traps = [asdict(s) for s in all_signals if "TRAP" in s.signal_name]

    # Sort bulls & bears by RVOL
    bulls = sorted(bulls, key=lambda x: x['rvol'], reverse=True)[:5]
    bears = sorted(bears, key=lambda x: x['rvol'], reverse=True)[:5]

    return ScoutReport(
        session_date=session_date,
        scout_time=scout_time,
        weather_above_vwap_pct=weather_pct,
        total_civs=total,
        signals=all_signals,
        top_bulls=bulls,
        top_bears=bears,
        top_traps=traps
    )
