"""
🏛️ GIDH BRAIN 1 (MACRO SELECTOR): CLI INTERFACE
Clean command-line tool for agents and humans to inspect sensory feeds, record decisions, and review EOD forensics.
"""

import os
import sys
import json
import warnings
import argparse

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

warnings.filterwarnings("ignore", category=UserWarning, module="pandas")

import pandas as pd
from quant.brains.macro_brain.dispatcher import MacroSelectorBrain
from quant.brains.macro_brain.types import MacroCandidate, MacroDecisions, MacroMemoryState

def main():
    parser = argparse.ArgumentParser(description="🧠 GIDH BRAIN 1: Macro Selector Tool")
    parser.add_argument("date", nargs="?", default="2026-09-04", help="Session Date (YYYY-MM-DD)")
    parser.add_argument("--mode", choices=["sensory", "record", "review"], default="sensory", help="Action mode")
    parser.add_argument("--outcome-date", help="Outcome date for EOD review")
    parser.add_argument("--decision-json", help="Path to JSON file containing decisions payload")
    parser.add_argument("--forensics", help="Forensic text summary for EOD review")
    parser.add_argument("--bulls", nargs="+", help="Focus Bull symbols (e.g. ADANIENT PAYTM)")
    parser.add_argument("--bears", nargs="+", help="Focus Bear symbols (e.g. HDFCBANK TCS)")
    parser.add_argument("--traps", nargs="+", help="Exhaustion Trap symbols (e.g. LAURUSLABS HAL)")
    parser.add_argument("--regime", default="MARKET_REGIME", help="Market regime label")
    parser.add_argument("--leader", help="Leading sector")
    parser.add_argument("--lagger", help="Lagging sector")
    parser.add_argument("--thesis", default="", help="AI Reasoning Thesis")
    args = parser.parse_args()

    brain = MacroSelectorBrain()
    session_date = args.date

    if args.mode == "sensory":
        print(f"\nGathering sensory packet for {session_date}...")
        packet = brain.build_sensory_packet(session_date)
        print("✅ Sensory packet built successfully.")
        print(f"Net Inflow 1D: ₹{packet.universe_net_inflow_1d_cr:+.1f} Cr | Net Inflow 3D: ₹{packet.universe_net_inflow_3d_cr:+.1f} Cr")
        print(f"Breadth: {packet.universe_advances} Adv / {packet.universe_declines} Dec")

    elif args.mode == "record":
        if args.decision_json:
            with open(args.decision_json, "r") as f:
                data = json.load(f)
        else:
            data = {
                "macro_regime_label": args.regime,
                "leading_sector": args.leader,
                "lagging_sector": args.lagger,
                "ai_thesis": args.thesis,
                "focus_bulls": [{"symbol": s, "prior_close": 0.0, "conviction_score": 9.0, "thesis": "Selected Bull"} for s in (args.bulls or [])],
                "focus_bears": [{"symbol": s, "prior_close": 0.0, "conviction_score": 9.0, "thesis": "Selected Bear"} for s in (args.bears or [])],
                "exhaustion_traps": [{"symbol": s, "prior_close": 0.0, "conviction_score": 9.0, "thesis": "Exhaustion Trap"} for s in (args.traps or [])],
            }
        
        packet = brain.build_sensory_packet(session_date)
        df_tradable = packet.full_tradable_dataframe

        def hydrate_candidate(item):
            sym = item.get("symbol")
            if df_tradable is not None and not df_tradable.empty and sym in df_tradable['symbol'].values:
                row = df_tradable[df_tradable['symbol'] == sym].iloc[0]
                if item.get("prior_close", 0.0) == 0.0:
                    item["prior_close"] = float(row['prior_close'])
                if item.get("sector") is None:
                    item["sector"] = str(row['sector'])
                if item.get("fuel_pct") is None:
                    item["fuel_pct"] = float(row['fuel_pct'])
                if item.get("cpr_width_pct") is None:
                    item["cpr_width_pct"] = float(row['cpr_width_pct'])
                if item.get("inflow_1d_cr") is None:
                    item["inflow_1d_cr"] = float(row['inflow_1d_cr'])
                if item.get("inflow_3d_cr") is None:
                    item["inflow_3d_cr"] = float(row['inflow_3d_cr'])
            return item

        bulls = [MacroCandidate(**hydrate_candidate(item)) for item in data.get("focus_bulls", [])]
        bears = [MacroCandidate(**hydrate_candidate(item)) for item in data.get("focus_bears", [])]
        traps = [MacroCandidate(**hydrate_candidate(item)) for item in data.get("exhaustion_traps", [])]
        
        decisions = MacroDecisions(
            macro_regime_label=data.get("macro_regime_label"),
            leading_sector=data.get("leading_sector"),
            lagging_sector=data.get("lagging_sector"),
            focus_bulls=bulls,
            focus_bears=bears,
            exhaustion_traps=traps
        )
        ai_thesis = data.get("ai_thesis", "")
        
        brain.record_decision(
            session_date=session_date,
            decisions=decisions,
            sensory_features=packet,
            ai_thesis=ai_thesis
        )
        print(f"✅ Decisions successfully recorded for session {session_date}!")

    elif args.mode == "review":
        outcome_date = args.outcome_date
        if not outcome_date:
            from quant.base.db import get_db_connection
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT session_date::text FROM market.cash_candles_1d WHERE session_date > %s GROUP BY session_date ORDER BY session_date ASC LIMIT 1;", (session_date,))
            row = cur.fetchone()
            conn.close()
            if not row:
                print(f"⚠️ No outcome session found after {session_date}.")
                sys.exit(0)
            outcome_date = row[0]

        forensics_text = args.forensics or "Automated EOD Forensic Review"
        res = brain.review_and_record_forensics(
            session_date=session_date,
            outcome_date=outcome_date,
            ai_forensics_summary=forensics_text
        )
        print(f"✅ EOD Review recorded ({session_date} -> {outcome_date})")
        print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
