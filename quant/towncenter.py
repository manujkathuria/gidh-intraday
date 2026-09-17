"""
🏛️ GIDH QUANT TOWNCENTER — Master CLI Cockpit
Directs all Brains via the BaseBrain Contract.
"""

import sys
import argparse
from quant.brains.macro_brain.dispatcher import MacroSelectorBrain

def main():
    parser = argparse.ArgumentParser(description="🦅 GIDH QUANT COCKPIT — Master Brains Interface")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # 1. Macro Brain Subcommand
    p_macro = subparsers.add_parser("macro", help="Run Brain 1: Macro Selector Sensory Feed")
    p_macro.add_argument("date", nargs="?", default="2026-09-08", help="Session Date (YYYY-MM-DD)")

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

        packet = brain.build_sensory_packet(session_date)
        if "error" in packet:
            print(f"❌ {packet['error']}")
            sys.exit(1)

        mem = brain.get_rolling_memory()
        print(f"🧬 Rolling Memory State: {mem.get('last_forensics', 'No prior memory')[:90]}...\n")

        print("★ TOP INSTITUTIONAL CAPITAL INFLOW CANDIDATES:")
        print(f"{'Symbol':<12} {'Price (₹)':<10} {'1D Inflow':<14} {'3D Inflow':<14} {'Fuel %':<10} {'CPR %':<10} {'Dist 20H'}")
        print("-" * 115)
        for r in packet['top_capital_inflow_candidates'][:8]:
            print(f"{r['symbol']:<12} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    ₹{r['inflow_3d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['cpr_width_pct']:>5.3f}%    {r['distance_20d_high_pct']:>5.1f}%")

        print("\n★ TOP INSTITUTIONAL CAPITAL OUTFLOW CANDIDATES:")
        print(f"{'Symbol':<12} {'Price (₹)':<10} {'1D Inflow':<14} {'3D Inflow':<14} {'Fuel %':<10} {'CPR %':<10} {'Dist 20L'}")
        print("-" * 115)
        for r in packet['top_capital_outflow_candidates'][:8]:
            print(f"{r['symbol']:<12} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    ₹{r['inflow_3d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['cpr_width_pct']:>5.3f}%    {r['distance_20d_low_pct']:>5.1f}%")

        print("\n★ POTENTIAL LOW-FUEL EXHAUSTION / TRAPS (Fuel < 25%):")
        print(f"{'Symbol':<12} {'Price (₹)':<10} {'1D Inflow':<14} {'Fuel %':<10} {'1D Move %'}")
        print("-" * 115)
        for r in packet['low_fuel_exhaustion_candidates'][:6]:
            print(f"{r['symbol']:<12} ₹{r['prior_close']:<9.2f} ₹{r['inflow_1d_cr']:>+7.1f} Cr    {r['fuel_pct']:>5.1f}%     {r['fut_price_1d_pct']:>+5.2f}%")

        print("=" * 115 + "\n")

    elif args.command == "memory":
        brain = MacroSelectorBrain() # default or map by args.brain
        mem = brain.get_rolling_memory()
        print(f"\n🧠 ROLLING MEMORY FOR [{args.brain}]:")
        import pprint
        pprint.pprint(mem)
        print()

if __name__ == "__main__":
    main()
