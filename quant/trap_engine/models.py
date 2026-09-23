from dataclasses import dataclass
from typing import Optional

@dataclass
class PureTrapCandidate:
    symbol: str
    instrument_id: int
    sector: Optional[str]
    setup_type: str                    # "BULL_TRAP" (Short) or "BEAR_TRAP" (Long)
    session_open: float
    session_high: float
    session_low: float
    price_at_945: float
    pdh: float
    pdl: float
    sweep_depth_pct: float             # How deep the sweep went beyond PDH/PDL
    rvol: float
    adv_20: int
    adr_20: float
