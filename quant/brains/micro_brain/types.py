from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class OpeningReactionMetrics:
    opening_gap_pct: float
    session_open: float
    open_cpr_position: str  # ABOVE_TC, INSIDE_CPR, BELOW_BC
    open_equals_low: bool
    open_equals_high: bool
    rvol_3m: float
    clv_3m: float

@dataclass
class VwapPullbackMetrics:
    session_vwap: float
    vwap_slope: float
    vwap_distance_sigma: float
    vwap_upper_1: float
    vwap_lower_1: float
    vwap_upper_2: float
    vwap_lower_2: float
    suggested_pullback_price: float

@dataclass
class OrbStructureMetrics:
    or15_high: float
    or15_low: float
    or15_midpoint: float
    or15_range_pct_atr: float
    upper_wick_pct: float
    lower_wick_pct: float
    structural_stop_price: float

@dataclass
class FuelAndOiMetrics:
    adr_20_pts: float
    adr_pct: float
    adr_fuel_used_pct: float
    fuel_remaining_pts: float
    remaining_target_price: float
    oi_change_15m: int
    futures_basis_pct: float

@dataclass
class CandidateIntradayState:
    symbol: str
    macro_bias: str  # LONG, SHORT
    macro_rank: int
    macro_thesis: str
    cmp: float
    opening: OpeningReactionMetrics
    vwap: VwapPullbackMetrics
    orb: OrbStructureMetrics
    fuel_oi: FuelAndOiMetrics

@dataclass
class MicroSensoryPacket:
    session_date: str
    as_of_time: str
    checkpoint: str  # 09:18_GATE, 09:31_EXECUTION
    rolling_memory: Dict[str, Any]
    candidates: List[CandidateIntradayState] = field(default_factory=list)

@dataclass
class MicroTradeDecision:
    symbol: str
    direction: str  # LONG, SHORT
    selection_rank: int
    execution_tactic: str  # VWAP_PULLBACK_LIMIT, ORB_BREAKOUT_STOP, CPR_BOUNCE_LIMIT
    target_entry_price: float
    invalidation_price: float
    target_1: float
    target_2: float
    risk_reward_ratio: float
    thesis: str

@dataclass
class MicroTradeDecisions:
    selected_trades: List[MicroTradeDecision] = field(default_factory=list)
    rejected_candidates: List[Dict[str, str]] = field(default_factory=list)
    ai_session_thesis: str = ""

@dataclass
class MicroTradeOutcome:
    symbol: str
    direction: str
    filled: bool
    fill_time: Optional[str]
    actual_entry_price: Optional[float]
    exit_price: Optional[float]
    pnl_pts: float
    pnl_pct: float
    r_multiple_captured: float
    status: str  # WIN, LOSS, MISSED, STOPPED_OUT
    forensics_note: str

@dataclass
class MicroOutcomes:
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    net_r_multiple: float
    trades: List[MicroTradeOutcome] = field(default_factory=list)
