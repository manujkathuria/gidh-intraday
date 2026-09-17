"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): RUNNER & CLI INTERFACE
Main entry point for Brain 1:
- Mode 1: `--mode premarket` (Runs Tool 1 + Tool 2 -> Intelligence -> Stores Picks in DB & Memory)
- Mode 2: `--mode eod` (Runs Tool 3 Review -> EOD Intelligence -> Updates Memory for next day)
- Mode 3: `--mode session` (Runs complete pre-market to EOD cycle for historical testing)
"""

import sys
import argparse
import pandas as pd
from quant.brains.macro_brain.intelligence import synthesize_premarket_focus, synthesize_eod_forensics

def main():
    parser = argparse.ArgumentParser(description="🧠 GIDH BRAIN 1: Macro Selector & Evolutionary Memory")
    parser.add_argument("date", nargs="?", default="2026-09-08", help="Session Date (YYYY-MM-DD)")
    parser.add_argument("--mode", choices=["premarket", "eod", "session"], default="session", help="Execution mode")
    parser.add_argument("--outcome-date", help="Outcome date for EOD review (default: auto next session)")
    args = parser.parse_args()

    session_date = args.date

    # 1. Pre-Market Selection Mode
    if args.mode in ["premarket", "session"]:
        print("\n" + "=" * 115)
        print(f"       🧠 GIDH BRAIN 1: PRE-MARKET MACRO SELECTION (SESSION: {session_date})")
        print("=" * 115)
        
        picks_df, reasoning = synthesize_premarket_focus(session_date)
        if picks_df.empty:
            print(f"❌ Failed to generate pre-market picks: {reasoning}")
            sys.exit(1)

        print(f"📝 Reasoning: {reasoning}\n")

        longs = picks_df[picks_df['stance'].str.contains('BULL|LONG', case=False, na=False)]
        shorts = picks_df[picks_df['stance'].str.contains('BEAR|SHORT', case=False, na=False)]
        traps = picks_df[picks_df['stance'].str.contains('EXHAUSTION|TRAP', case=False, na=False)]

        if not longs.empty:
            print("🟢 FOCUS LONGS (Institutional Inflow + Available Range Fuel):")
            print(f"{'#':<3} {'Symbol':<12} {'Price (₹)':<10} {'1D Inflow':<14} {'3D Inflow':<14} {'Fuel %':<10} {'CPR %':<10} {'Score'}")
            print("-" * 115)
            for idx, (_, r) in enumerate(longs.iterrows(), 1):
                print(f"{idx:<3} {r['symbol']:<12} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    ₹{r['inflow_3d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['cpr_width_pct']:>5.3f}%    {r['conviction_score']:>6.1f}")

        if not shorts.empty:
            print("\n🔴 FOCUS SHORTS (Institutional Outflow + Breakdown Setup):")
            print(f"{'#':<3} {'Symbol':<12} {'Price (₹)':<10} {'1D Inflow':<14} {'3D Inflow':<14} {'Fuel %':<10} {'CPR %':<10} {'Score'}")
            print("-" * 115)
            for idx, (_, r) in enumerate(shorts.iterrows(), 1):
                print(f"{idx:<3} {r['symbol']:<12} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    ₹{r['inflow_3d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['cpr_width_pct']:>5.3f}%    {r['conviction_score']:>6.1f}")

        if not traps.empty:
            print("\n⚠️ BLACKLISTED EXHAUSTION TRAPS (0-20% Fuel — High Risk Gap-and-Fade):")
            print(f"{'#':<3} {'Symbol':<12} {'Price (₹)':<10} {'1D Inflow':<14} {'Fuel %':<10} {'1D Move %':<12} {'Warning Score'}")
            print("-" * 115)
            for idx, (_, r) in enumerate(traps.iterrows(), 1):
                print(f"{idx:<3} {r['symbol']:<12} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['fut_price_1d_pct']:>+5.2f}%        {r['conviction_score']:>6.1f}")

        print("\n✅ Picks successfully stored in `quant.macro_daily_picks` and Memory!")
        print("=" * 115 + "\n")

    # 2. EOD Review Mode
    if args.mode in ["eod", "session"]:
        outcome_date = args.outcome_date
        if outcome_date is None:
            # Auto-detect next trading date
            from quant.base.db import get_db_connection
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT session_date::text FROM market.cash_candles_1d WHERE session_date > %s GROUP BY session_date ORDER BY session_date ASC LIMIT 1;", (session_date,))
            row = cur.fetchone()
            conn.close()
            if not row:
                print(f"⚠️ No outcome session found after {session_date}. Skipping EOD review.")
                sys.exit(0)
            outcome_date = row[0]

        print("=" * 115)
        print(f"       📊 GIDH BRAIN 1: EOD POST-MARKET FORENSIC REVIEW ({session_date} ➔ {outcome_date})")
        print("=" * 115)

        review_res = synthesize_eod_forensics(session_date, outcome_date)
        if "error" in review_res:
            print(f"❌ Review error: {review_res['error']}")
            sys.exit(1)

        long_s = review_res.get("long_stats", {})
        short_s = review_res.get("short_stats", {})
        trap_s = review_res.get("trap_stats", {})

        if long_s:
            print(f"🟢 Longs Performance:  Win Rate: {long_s.get('win_rate_pct')}% | Avg Net: {long_s.get('avg_eod_net_pct'):+.2f}% | Avg Expansion: +{long_s.get('avg_intraday_expansion_pct')}% | Top Bull: {long_s.get('top_bull')} ({long_s.get('top_bull_return_pct'):+.2f}%)")
        if short_s:
            print(f"🔴 Shorts Performance: Win Rate: {short_s.get('win_rate_pct')}% | Avg Net: {short_s.get('avg_eod_net_pct'):+.2f}% | Avg Drop: {short_s.get('avg_intraday_drop_pct'):+.2f}% | Top Bear: {short_s.get('top_bear')} ({short_s.get('top_bear_return_pct'):+.2f}%)")
        if trap_s:
            print(f"⚠️ Trap Accuracy:      {trap_s.get('trap_avoidance_accuracy_pct')}% ({trap_s.get('faded_count')}/{trap_s.get('count')} blacklisted traps faded intraday from open)")

        print(f"\n🧬 Memory Forensics Note: {review_res.get('forensics_text')}")
        print("\n✅ Memory updated for next trading session!")
        print("=" * 115 + "\n")

if __name__ == "__main__":
    main()
