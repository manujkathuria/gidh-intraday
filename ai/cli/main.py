"""
Antigravity Unified CLI Interface
"""

import argparse
import pandas as pd
from ai.pipeline.market_feed import get_trading_days
from ai.pipeline.scout_pipeline import extract_scout_features
from ai.ranking.scorer import run_scout_synthesis
from ai.verification.auditor import audit_session_ground_truth

def cmd_scout(args):
    session_date = args.date
    scout_time = args.time or "09:30:00"

    print(f"\n=======================================================")
    print(f"🏰 09:30 AM WAR ROOM SCOUTING REPORT: {session_date} @ {scout_time}")
    print(f"=======================================================\n")

    df = extract_scout_features(session_date, scout_time)
    if df.empty:
        print(f"❌ No market data found for {session_date}")
        return

    report = run_scout_synthesis(df, session_date, scout_time)

    print(f"🌦️ REALM MAP WEATHER: {report.weather_above_vwap_pct}% Above VWAP ({int(df['is_above_vwap'].sum())}/{report.total_civs} Civs)\n")

    print("🏹 TOP 5 SYNTHESIZED BULL BOUNTIES:")
    if report.top_bulls:
        print(pd.DataFrame(report.top_bulls)[['symbol', 'sector', 'signal_name', 'move_pct', 'rvol', 'clv', 'confidence']].to_string(index=False))
    else:
        print("  None detected.")

    print("\n💣 TOP 5 SYNTHESIZED BEAR BOUNTIES:")
    if report.top_bears:
        print(pd.DataFrame(report.top_bears)[['symbol', 'sector', 'signal_name', 'move_pct', 'rvol', 'clv', 'confidence']].to_string(index=False))
    else:
        print("  None detected.")

    print(f"\n🪤 DETECTED TRAPS & MANIPULATION FEINTS ({len(report.top_traps)} found):")
    if report.top_traps:
        for t in report.top_traps:
            print(f"  • [{t['confidence']}] {t['symbol']} ({t['sector']}): {t['signal_name']} -> {t['rationale']}")
    else:
        print("  None detected.")

    print("\n")

def cmd_unbox(args):
    session_date = args.date
    print(f"\n=======================================================")
    print(f"🏆 15:15 PM EOD GROUND TRUTH UNBOXING: {session_date}")
    print(f"=======================================================\n")

    df = audit_session_ground_truth(session_date)
    if df.empty:
        print(f"❌ No EOD data found for {session_date}")
        return

    print("🥇 TOP 10 FULL-DAY GAME MVPs (GAINERS):")
    print(df.head(10)[['symbol', 'full_day_pct', 'post_scout_return_pct', 'max_mfe_long_pct']].to_string(index=False))

    print("\n💣 TOP 10 ANNIHILATED BASES (LOSERS):")
    print(df.sort_values(by='full_day_pct', ascending=True).head(10)[['symbol', 'full_day_pct', 'post_scout_return_pct', 'max_mfe_short_pct']].to_string(index=False))
    print("\n")

def cmd_days(args):
    days = get_trading_days(args.limit)
    print(f"Available Trading Days ({len(days)} shown):")
    for d in days:
        print(f"  {d}")

def main():
    parser = argparse.ArgumentParser(description="Antigravity Quantitative Alpha Engine")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # scout
    p_scout = subparsers.add_parser("scout", help="Scout market at 09:30 AM")
    p_scout.add_argument("--date", required=True, help="Session date YYYY-MM-DD")
    p_scout.add_argument("--time", default="09:30:00", help="Time snapshot (default: 09:30:00)")
    p_scout.set_defaults(func=cmd_scout)

    # unbox
    p_unbox = subparsers.add_parser("unbox", help="Unbox 15:15 PM ground truth")
    p_unbox.add_argument("--date", required=True, help="Session date YYYY-MM-DD")
    p_unbox.set_defaults(func=cmd_unbox)

    # days
    p_days = subparsers.add_parser("days", help="List available trading days")
    p_days.add_argument("--limit", type=int, default=20, help="Max days to show")
    p_days.set_defaults(func=cmd_days)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
