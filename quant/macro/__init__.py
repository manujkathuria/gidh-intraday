"""
🏛️ GIDH QUANT MACRO PACKAGE
Step 1 Institutional Futures Inflow, Macro Fuel Gate, Campaign Tracking, & Data Integrity.
"""

from quant.macro.step1 import run_macro_step1, get_daily_macro_picks
from quant.macro.tracker import get_campaign_status
from quant.macro.scanner import run_premarket_scan
from quant.macro.integrity import backfill_macro_picks, verify_data_integrity

__all__ = [
    "run_macro_step1",
    "get_daily_macro_picks",
    "get_campaign_status",
    "run_premarket_scan",
    "backfill_macro_picks",
    "verify_data_integrity",
]
