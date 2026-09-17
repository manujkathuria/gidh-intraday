"""
🏛️ GIDH QUANT TOWNCENTER — Master CLI Cockpit
Directs all Brains via the BaseBrain Contract.
"""

import sys
import os

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

import argparse
from quant.brains.macro_brain.dispatcher import MacroSelectorBrain

def main():
    parser = argparse.ArgumentParser(description="🦅 GIDH QUANT COCKPIT — Master Brains Interface")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # 1. Macro Brain Subcommand
    p_macro = subparsers.add_parser("macro", help="Run Brain 1: Market Macro & Sector Selector Sensory Feed")
    p_macro.add_argument("date", nargs="?", default="2026-09-01", help="Session Date (YYYY-MM-DD)")

    # 2. Memory Subcommand
    p_mem = subparsers.add_parser("memory", help="Inspect rolling cognitive memory for a brain")
    p_mem.add_argument("--brain", default="macro_selector", help="Brain identifier (default: macro_selector)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "macro":
        brain = MacroSelectorBrain()
        session_date = args.date
        print("\n" + "=" * 115)
        print(f"       🧠 GIDH BRAIN: [{brain.brain_id.upper()}] SENSORY PACKET (SESSION: {session_date})")
        print("=" * 115)

        try:
            packet = brain.build_sensory_packet(session_date)
        except Exception as e:
            print(f"❌ {e}")
            sys.exit(1)

        mem = brain.get_rolling_memory()
        print(f"🧬 Market Regime: {mem.get('market_regime', 'Calibrating...')}")
        if mem.get('learned_rules'):
            print("📜 Learned Rules:")
            for rule in mem['learned_rules'][:3]:
                print(f"  • {rule}")
        print()

        # 1. Broad Market Breadth
        print("🏛️ UNIVERSE MARKET BREADTH & NET INSTITUTIONAL FLOWS:")
        print(f"  • Total Net 1D Inflow: ₹{packet.universe_net_inflow_1d_cr:>+8.1f} Cr | Net 3D Inflow: ₹{packet.universe_net_inflow_3d_cr:>+8.1f} Cr")
        print(f"  • Breadth: {packet.universe_advances} Advances vs {packet.universe_declines} Declines | Above SMA20: {packet.pct_above_sma20}% | Above SMA50: {packet.pct_above_sma50}%\n")

        # 2. Sector Capital Waves
        print("🌊 SECTOR CAPITAL ROTATION WAVES (Ranked by Net 1D Institutional Inflow):")
        print(f"{'Sector':<24} {'Stocks':<7} {'1D Inflow':<14} {'3D Inflow':<14} {'Breadth':<9} {'Top Bull':<12} {'Top Bear'}")
        print("-" * 115)
        for s in packet.sector_capital_waves:
            print(f"{s['sector']:<24} {s['stock_count']:<7} ₹{s['net_inflow_1d_cr']:>+7.1f} Cr    ₹{s['net_inflow_3d_cr']:>+7.1f} Cr    {s['breadth_pct']:>5.1f}%    {s['top_bull_symbol']:<12} {s['top_bear_symbol']}")

        # 3. Top Stock Candidates
        print("\n★ TOP CAPITAL INFLOW CANDIDATES (BULLISH ALPHA):")
        print(f"{'Symbol':<12} {'Sector':<20} {'Price':<10} {'1D Inflow':<14} {'3D Inflow':<14} {'Fuel %':<10} {'CPR %'}")
        print("-" * 115)
        for r in packet.top_capital_inflow_candidates[:6]:
            print(f"{r['symbol']:<12} {r.get('sector', ''):<20} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    ₹{r['inflow_3d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['cpr_width_pct']:>5.3f}%")

        print("\n★ TOP CAPITAL OUTFLOW CANDIDATES (BEARISH DISTRIBUTION):")
        print(f"{'Symbol':<12} {'Sector':<20} {'Price':<10} {'1D Inflow':<14} {'3D Inflow':<14} {'Fuel %':<10} {'CPR %'}")
        print("-" * 115)
        for r in packet.top_capital_outflow_candidates[:6]:
            print(f"{r['symbol']:<12} {r.get('sector', ''):<20} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    ₹{r['inflow_3d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['cpr_width_pct']:>5.3f}%")

        print("\n★ COMPRESSED COILING SPRINGS (Fuel >= 35%, CPR <= 0.35%):")
        print(f"{'Symbol':<12} {'Sector':<20} {'Price':<10} {'1D Inflow':<14} {'3D Inflow':<14} {'Fuel %':<10} {'CPR %'}")
        print("-" * 115)
        for r in packet.top_compressed_coiling_springs[:6]:
            print(f"{r['symbol']:<12} {r.get('sector', ''):<20} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    ₹{r['inflow_3d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['cpr_width_pct']:>5.3f}%")

        print("\n★ BLACKLISTED LOW-FUEL EXHAUSTION TRAPS (Fuel < 25%):")
        print(f"{'Symbol':<12} {'Sector':<20} {'Price':<10} {'1D Inflow':<14} {'Fuel %':<10} {'1D Move %'}")
        print("-" * 115)
        for r in packet.low_fuel_exhaustion_candidates[:5]:
            print(f"{r['symbol']:<12} {r.get('sector', ''):<20} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['fut_price_1d_pct']:>+5.2f}%")

        print("=" * 115 + "\n")

    elif args.command == "memory":
        brain = MacroSelectorBrain()
        mem = brain.get_rolling_memory()
        print("\n" + "=" * 90)
        print(f"       🧠 GIDH COGNITIVE ROLLING MEMORY: [{args.brain.upper()}]")
        print("=" * 90)
        print(f"📅 Last Calibrated Session: {mem.get('last_session_date', 'N/A')}")
        print(f"🏛️ Current Macro Regime   : {mem.get('market_regime', 'N/A')}\n")

        if mem.get("active_campaigns"):
            print("🎯 ACTIVE MULTI-DAY INSTITUTIONAL CAMPAIGNS:")
            for sym, camp in mem["active_campaigns"].items():
                print(f"  • [{sym}]: {camp}")
            print()

        if mem.get("learned_rules"):
            print("📜 LEARNED TRADING RULES & PATTERNS:")
            for r in mem["learned_rules"]:
                print(f"  • {r}")
            print()

        if mem.get("traps_to_avoid"):
            print("⚠️ CURRENT BLACKLIST & TRAPS TO AVOID:")
            for t in mem["traps_to_avoid"]:
                print(f"  • {t}")
            print()

        print("=" * 90 + "\n")

if __name__ == "__main__":
    main()
