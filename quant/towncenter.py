"""
🏛️ GIDH QUANT TOWNCENTER — Master CLI Cockpit
Directs all Brains via the BaseBrain Contract.
"""

import sys
import os
import json
import argparse
from dataclasses import asdict

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

from quant.brains.macro_brain.dispatcher import MacroSelectorBrain
from quant.brains.micro_brain.dispatcher import MicroBrain

def main():
    parser = argparse.ArgumentParser(description="🦅 GIDH QUANT COCKPIT — Master Brains Interface")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # 1. Macro Brain
    p_macro = subparsers.add_parser("macro", help="Run Brain 1: Market Macro & Sector Selector Sensory Feed")
    p_macro.add_argument("date", nargs="?", default="2026-09-01", help="Session Date (YYYY-MM-DD)")

    # 2. Micro Brain
    p_micro = subparsers.add_parser("micro", help="Run Brain 2: Micro Execution & Squeeze Sensory Feed")
    p_micro.add_argument("date", nargs="?", default="2026-09-01", help="Session Date (YYYY-MM-DD)")
    p_micro.add_argument("--time", default="09:31:00", help="As-of time (default: 09:31:00)")

    # 3. Memory Subcommand
    p_mem = subparsers.add_parser("memory", help="Inspect rolling cognitive memory for a brain")
    p_mem.add_argument("--brain", default="macro_selector", help="Brain identifier")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "macro":
        brain = MacroSelectorBrain()
        pkt = brain.build_sensory_packet(args.date)
        print(f"\n🧠 [MACRO_SELECTOR] SENSORY PACKET — {args.date}")
        print(f"Net 1D Inflow: ₹{pkt.universe_net_inflow_1d_cr:+.1f} Cr | Breadth: {pkt.universe_advances}A / {pkt.universe_declines}D")
        print("\n🌊 Top Inflow Candidates:")
        for r in pkt.top_capital_inflow_candidates[:6]:
            print(f"  • {r['symbol']:<12} Price: ₹{r['prior_close']:<8.2f} 1D Inflow: ₹{r['inflow_1d_cr']:>+6.1f} Cr Fuel: {r['fuel_pct']:.1f}%")
        print("\n🌊 Top Outflow Candidates:")
        for r in pkt.top_capital_outflow_candidates[:6]:
            print(f"  • {r['symbol']:<12} Price: ₹{r['prior_close']:<8.2f} 1D Inflow: ₹{r['inflow_1d_cr']:>+6.1f} Cr Fuel: {r['fuel_pct']:.1f}%")

    elif args.command == "micro":
        brain = MicroBrain()
        pkt = brain.build_sensory_packet(args.date, as_of_time=args.time)
        print(f"\n🧠 [MICRO_BRAIN] OPENING SENSORY PACKET — {args.date} @ {args.time}")
        print(f"Candidates from Macro: {len(pkt.candidates)}")
        print("-" * 110)
        print(f"{'Symbol':<12} {'Bias':<6} {'CMP':<10} {'Gap%':<8} {'CPR Pos':<12} {'VWAP':<10} {'VWAP σ':<8} {'RVOL':<7} {'OR15 H/L':<20} {'Fuel%'}")
        print("-" * 110)
        for c in pkt.candidates:
            or_str = f"₹{c.orb.or15_high:.1f} / {c.orb.or15_low:.1f}"
            print(f"{c.symbol:<12} {c.macro_bias:<6} ₹{c.cmp:<9.2f} {c.opening.opening_gap_pct:>+5.2f}%  {c.opening.open_cpr_position:<12} ₹{c.vwap.session_vwap:<9.2f} {c.vwap.vwap_distance_sigma:>+5.2f}σ {c.opening.rvol_3m:>5.1f}x  {or_str:<20} {c.fuel_oi.adr_fuel_used_pct:>5.1f}%")
        print("-" * 110)

    elif args.command == "memory":
        brain = MacroSelectorBrain() if args.brain == "macro_selector" else MicroBrain()
        mem = brain.get_rolling_memory()
        print(f"\n🧠 ROLLING MEMORY: [{args.brain.upper()}]")
        print(json.dumps(mem, indent=2, default=str))

if __name__ == "__main__":
    main()
