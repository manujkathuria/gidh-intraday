"""
🏛️ GIDH QUANT TOWNCENTER — Unified Trading Cockpit & Evolutionary Base
"""

import sys
import argparse
import pandas as pd
from quant.base.db import get_db_connection
from quant.macro import (
    run_macro_step1,
    get_campaign_status,
    run_premarket_scan,
    backfill_macro_picks,
    verify_data_integrity
)
from quant.execution.simulator import simulate_session_execution
from quant.evolution.post_mortem import analyze_trade_forensics
from quant.tools.inspector import inspect_stock

def main():
    parser = argparse.ArgumentParser(description="🦅 GIDH QUANT BASE — Cockpit & Evolution Engine")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # 1. Step 1 Macro Subcommand
    p_macro = subparsers.add_parser("macro", help="Run Step 1 Institutional Macro Futures Inflow & Fuel Pipeline")
    p_macro.add_argument("date", nargs="?", default="2026-09-08", help="Session Date (YYYY-MM-DD)")
    p_macro.add_argument("--inflow", type=float, default=40.0, help="Min 1D Inflow ₹ Cr (default: 40.0)")
    p_macro.add_argument("--oi", type=float, default=3.5, help="Min 1D OI % (default: 3.5)")
    p_macro.add_argument("--fuel", type=float, default=35.0, help="Min Macro Fuel % (default: 35.0)")

    # 2. Historical Backfill Subcommand
    p_bf = subparsers.add_parser("backfill", help="Backfill quant.macro_daily_picks for all historical sessions")
    p_bf.add_argument("--start", help="Start Date (YYYY-MM-DD)")
    p_bf.add_argument("--end", help="End Date (YYYY-MM-DD)")

    # 3. Data Integrity Subcommand
    p_audit = subparsers.add_parser("audit", help="Run Data Integrity Audit between Market & Quant Schemas")

    # 2. Campaigns Subcommand
    p_camp = subparsers.add_parser("campaigns", help="Track Multi-Day Institutional Campaigns across F&O Universe")
    p_camp.add_argument("date", nargs="?", default="2026-08-25", help="Session Date (YYYY-MM-DD)")

    # 3. Premarket Scan Subcommand
    p_scan = subparsers.add_parser("scan", help="Run 5-Gate Pre-Market Watchlist Scan")
    p_scan.add_argument("date", nargs="?", default="2026-08-25", help="Session Date (YYYY-MM-DD)")

    # 4. Simulate Subcommand
    p_sim = subparsers.add_parser("simulate", help="Run Dynamic 1-Minute Micro-Gate Simulation & PnL")
    p_sim.add_argument("date", nargs="?", default="2026-08-25", help="Session Date (YYYY-MM-DD)")

    # 5. Forensics / Evolution Subcommand
    p_evo = subparsers.add_parser("evolve", help="Run EOD Forensic Analysis and Edge Extraction")
    p_evo.add_argument("date", nargs="?", default="2026-08-25", help="Session Date (YYYY-MM-DD)")

    # 6. Inspect Subcommand
    p_insp = subparsers.add_parser("inspect", help="Inspect Single Stock Volume Profile & POC Castle")
    p_insp.add_argument("symbol", help="Stock Symbol (e.g. COFORGE, POLICYBZR)")
    p_insp.add_argument("date", nargs="?", default="2026-08-25", help="Session Date (YYYY-MM-DD)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    conn = get_db_connection()

    if args.command == "macro":
        run_macro_step1(args.date, min_inflow_cr=args.inflow, min_oi_pct=args.oi, min_fuel_pct=args.fuel)

    elif args.command == "backfill":
        backfill_macro_picks(start_date=args.start, end_date=args.end)
        verify_data_integrity()

    elif args.command == "audit":
        verify_data_integrity()

    elif args.command == "campaigns":
        df = get_campaign_status(args.date, conn=conn)
        print(f"\n=========================================================================================")
        print(f"=== 🦅 INSTITUTIONAL CAMPAIGN TRACKER (Session: {args.date}) ===")
        print(f"=========================================================================================")
        if df.empty:
            print("No data available.")
        else:
            active = df[df['campaign_stage'] != 'CHOP_RANGE']
            cols = ['symbol', 'prior_close', 'campaign_stage', 'fut_price_chg_pct', 'fut_oi_1d_chg_pct', 'return_5d_pct', 'distance_20d_high_pct', 'distance_20d_low_pct']
            print(active[cols].to_string(index=False))

    elif args.command == "scan":
        longs, shorts, _ = run_premarket_scan(args.date, conn=conn)
        print(f"\n=========================================================================================")
        print(f"=== 🦅 GIDH PRE-MARKET 5-GATE WATCHLIST (Session: {args.date}) ===")
        print(f"=========================================================================================")
        print("\n>>> 🟢 TOP LONG CANDIDATES:")
        if longs is not None and not longs.empty:
            print(longs[['symbol', 'prior_close', 'cpr_width_pct', 'adr_pct', 'distance_20d_high_pct', 'suggested_qty', 'target_1_adr', 'invalidation_sl']].to_string(index=False))
        else:
            print("No Long candidates passed all 5 gates.")

        print("\n>>> 🔴 TOP SHORT CANDIDATES:")
        if shorts is not None and not shorts.empty:
            print(shorts[['symbol', 'prior_close', 'cpr_width_pct', 'adr_pct', 'distance_20d_low_pct', 'suggested_qty', 'target_1_adr', 'invalidation_sl']].to_string(index=False))
        else:
            print("No Short candidates passed all 5 gates.")

    elif args.command == "simulate":
        longs, shorts, feat_id = run_premarket_scan(args.date, conn=conn)
        if longs is None:
            sys.exit(1)
        res = simulate_session_execution(args.date, longs, shorts, feat_id, conn=conn)
        print(f"\n=========================================================================================")
        print(f"=== 🦅 DYNAMIC 1-MIN EXECUTION & REALIZED PnL ({args.date}) ===")
        print(f"=========================================================================================")
        if res.empty:
            print("No trades triggered.")
        else:
            print(res.to_string(index=False))
            stats = analyze_trade_forensics(res)
            print(f"\n>>> FORENSICS: Executed: {stats.get('executed_trades')} | Win Rate: {stats.get('win_rate_pct')}% | Net PnL: ₹{stats.get('total_net_pnl_₹'):+.2f} | Profit Factor: {stats.get('profit_factor')}")

    elif args.command == "evolve":
        longs, shorts, feat_id = run_premarket_scan(args.date, conn=conn)
        res = simulate_session_execution(args.date, longs, shorts, feat_id, conn=conn)
        stats = analyze_trade_forensics(res)
        print(f"\n=== 🧬 FORENSIC LAB SUMMARY ({args.date}) ===")
        for k, v in stats.items():
            print(f" - {k}: {v}")

    elif args.command == "inspect":
        inspect_stock(args.symbol, args.date, conn=conn)

if __name__ == "__main__":
    main()
