from dataclasses import dataclass
from typing import Optional
from enum import Enum

class CampaignStage(str, Enum):
    DAY_1_BULL_LAUNCH = "DAY_1_BULL_LAUNCH"
    DAY_1_BEAR_LAUNCH = "DAY_1_BEAR_LAUNCH"
    ACTIVE_BULL_CAMPAIGN = "ACTIVE_BULL_CAMPAIGN"
    ACTIVE_BEAR_CAMPAIGN = "ACTIVE_BEAR_CAMPAIGN"
    BULL_SPRING_COILING = "BULL_SPRING_COILING"
    BEAR_SPRING_COILING = "BEAR_SPRING_COILING"
    EXHAUSTION_CHURN = "EXHAUSTION_CHURN"
    CHOP_RANGE = "CHOP_RANGE"

class OrderSide(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"

@dataclass
class TradeSignal:
    symbol: str
    instrument_id: int
    side: OrderSide
    entry_price: float
    shares: int
    trigger_time: str
    fuel_at_entry_pct: float
    rvol_at_entry: float
    target_1: float
    invalidation_sl: float
    reason: str

@dataclass
class TradeResult:
    symbol: str
    side: OrderSide
    trigger_time: str
    entry_price: float
    exit_price: float
    shares: int
    mfe_pct: float
    mae_pct: float
    gross_pnl: float
    net_pnl: float
    roi_pct: float
    status: str
    filter_reason: str
