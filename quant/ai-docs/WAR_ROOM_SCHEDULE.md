# Live War Room Daily Operating Schedule

This document defines the strict standard operating procedure (SOP) and checkpoint timeline for the Gidh Quant Live Trading War Room in Indian Standard Time (IST).

---

## 1. Timeline & Checkpoint Schedule

| Time (IST) | Phase | Objective | Tools / Commands |
| :--- | :--- | :--- | :--- |
| **08:45 – 09:00 AM** | **Pre-Market Warmup** | • Refresh Zerodha Kite Token<br>• Verify PostgreSQL & Go Backend<br>• Check GIFT Nifty & Global Macro Cues | `make auth`<br>`docker ps`<br>`make api` |
| **09:08 – 09:14 AM** | **Pre-Open Snapshot** | • Pre-open order matching settles<br>• Identify top opening gap-up & gap-down candidates | Pre-open screen / market depth |
| **09:15 – 09:30 AM** | **Market Open & Observation** | • Live candle feed ingestion begins<br>• Strictly NO trade entries during first 15 mins (Let opening volatility settle) | Relax & wait for the 09:30 close |
| **09:30:05 AM** | **🎯 Checkpoint 1 (09:30 Bar Close)** | • First 15m candle closes<br>• Screen for Tier 1 Monster volume openers (`RVOL >= 5x`)<br>• Screen for 09:30 Sector Battalion Leaders | `python3 quant/tools/decision_screen.py --time 09:30`<br>`python3 quant/tools/battalion_scanner.py --time 09:30` |
| **09:45:05 AM** | **🎯 Checkpoint 2 (09:45 Bar Close)** | • Second 15m candle closes<br>• Identify False Breakout Bull/Bear Traps (high wicks + low CLV)<br>• Confirm Battalion Followers<br>• Fill active portfolio to 5 trades | `python3 quant/tools/decision_screen.py --time 09:45`<br>`python3 quant/tools/battalion_scanner.py --time 09:45` |
| **10:45 AM** | **Checkpoint 3 (Trend Health)** | • First major trend health check<br>• Verify VWAP alignment on all active trades | `python3 quant/tools/scout.py --time 10:45` |
| **11:30 AM** | **🎯 Checkpoint 4 (11:30 Split-Exit)** | • **11:30 Mandatory Split-Exit**: Cut any Tier 3 position losing VWAP<br>• **Milestone Ratchet**: Lock Breakeven floor (`0.0%`) on any position with `+1.5% MFE` | `python3 quant/tools/scout.py --time 11:30` |
| **12:30 PM** | **Checkpoint 5 (Midday Health)** | • Midday radar check<br>• Lock `+1.0%` floor on any position with `+2.5% MFE` | `python3 quant/tools/scout.py --time 12:30` |
| **02:30 PM** | **Checkpoint 6 (Afternoon Sweep)** | • Afternoon power hour evaluation<br>• Trail stops on winning runners | `python3 quant/tools/scout.py --time 14:30` |
| **03:15 – 03:20 PM** | **EOD Square-Off & Review** | • Square-off all remaining open MIS positions before broker cutoff<br>• Ingest daily ledger into database | `python3 quant/tools/db_sync.py --day <N>` |

---

## 2. Capital & Risk Allocation Rules

- **Total Capital Pool**: ₹50,000 INR
- **Position Allocation**: Exactly 5 trades × ₹10,000 margin each (5x MIS Leverage = ₹50,000 gross exposure per position).
- **Max Portfolio Drawdown Floor**: Hard -1.0% cap per day (`-500 INR`).
- **Single Trade Invalidation Stop**: -0.70% (~`70 INR`).
- **Average Target**: +1.50% to +3.50% (`+150` to `+350 INR` per winner).

---

## 3. The 3 Golden Operational Rules

1. **The Chill Guy Principle**: Never watch tick-by-tick order books. Decisions are executed exclusively on **15-minute candle bar closes**.
2. **Anti-Trap Invalidation**: Do not panic on intra-bar wicks. If a manipulative wick dips below VWAP but closes above VWAP by the 15-minute mark, hold the position.
3. **Breakeven Ratchet**: Once a position crosses **+1.5% MFE**, ratchet the stop floor to Entry (`0.0%`). Never allow a winner to turn into a loss.
