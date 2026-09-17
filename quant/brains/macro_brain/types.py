"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): TYPE DEFINITIONS & SCHEMAS
Strict, type-safe Python dataclasses for Market Macro Brain 1.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from enum import Enum
import pandas as pd

class MacroStance(str, Enum):
    FOCUS_BULLS = "FOCUS_BULLS"
    FOCUS_BEARS = "FOCUS_BEARS"
    EXHAUSTION_TRAPS = "EXHAUSTION_TRAPS"

@dataclass
class MacroCandidate:
    symbol: str
    prior_close: float
    conviction_score: float  # 0.0 to 10.0
    thesis: str
    stance: Optional[MacroStance] = None
    sector: Optional[str] = None
    inflow_1d_cr: Optional[float] = None
    inflow_3d_cr: Optional[float] = None
    inflow_5d_cr: Optional[float] = None
    fuel_pct: Optional[float] = None
    cpr_width_pct: Optional[float] = None
    distance_20d_high_pct: Optional[float] = None
    distance_20d_low_pct: Optional[float] = None

@dataclass
class MacroDecisions:
    focus_bulls: List[MacroCandidate] = field(default_factory=list)
    focus_bears: List[MacroCandidate] = field(default_factory=list)
    exhaustion_traps: List[MacroCandidate] = field(default_factory=list)
    leading_sector: Optional[str] = None
    lagging_sector: Optional[str] = None
    macro_regime_label: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

@dataclass
class MacroSensoryPacket:
    session_date: str
    brain_id: str
    rolling_memory: Dict[str, Any]
    universe_net_inflow_1d_cr: float
    universe_net_inflow_3d_cr: float
    universe_advances: int
    universe_declines: int
    pct_above_sma20: float
    pct_above_sma50: float
    sector_capital_waves: List[Dict[str, Any]]
    top_capital_inflow_candidates: List[Dict[str, Any]]
    top_capital_outflow_candidates: List[Dict[str, Any]]
    top_compressed_coiling_springs: List[Dict[str, Any]]
    low_fuel_exhaustion_candidates: List[Dict[str, Any]]
    full_tradable_dataframe: Optional[pd.DataFrame] = None

@dataclass
class MacroOutcomeItem:
    symbol: str
    stance: str
    prior_close: float
    t1_open: float
    t1_high: float
    t1_low: float
    t1_close: float
    t1_volume: int
    gap_pct: float
    intraday_max_long_pct: float
    intraday_max_short_pct: float
    intraday_fade_pct: float
    eod_net_pct: float
    sector: Optional[str] = None
    inflow_1d_cr: Optional[float] = None
    fuel_pct: Optional[float] = None
    cpr_width_pct: Optional[float] = None
    thesis: Optional[str] = None

@dataclass
class MacroCategoryStats:
    count: int
    win_rate_pct: float
    avg_eod_net_pct: float
    avg_intraday_expansion_pct: Optional[float] = None
    avg_intraday_drawdown_pct: Optional[float] = None
    avg_intraday_drop_pct: Optional[float] = None
    top_bull: Optional[str] = None
    top_bull_return_pct: Optional[float] = None
    top_bear: Optional[str] = None
    top_bear_return_pct: Optional[float] = None

@dataclass
class MacroOutcomes:
    outcome_date: str
    merged_records: List[MacroOutcomeItem] = field(default_factory=list)
    long_stats: Optional[MacroCategoryStats] = None
    short_stats: Optional[MacroCategoryStats] = None
    trap_stats: Dict[str, Any] = field(default_factory=dict)
    ai_forensics_summary: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

@dataclass
class MacroMemoryState:
    last_session_date: str
    market_regime: str
    learned_rules: List[str] = field(default_factory=list)
    active_campaigns: Dict[str, str] = field(default_factory=dict)
    traps_to_avoid: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)
