import sys
import os
import json
import argparse
from dataclasses import asdict

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

from quant.base.db import get_db_connection
from quant.brains.micro_brain.dispatcher import MicroBrain
from quant.brains.micro_brain.types import MicroTradeDecision, MicroTradeDecisions, MicroOutcomes
from quant.brains.micro_brain.tools.micro_simulator import simulate_micro_execution

def main():
    parser = argparse.ArgumentParser(description="GIDH Micro Execution Brain CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 1. Sense
    sense_p = subparsers.add_parser("sense", help="Extract intraday sensory packet for Macro candidates")
    sense_p.add_argument("date", help="Session date (YYYY-MM-DD)")
    sense_p.add_argument("--time", default="09:31:00", help="As-of evaluation time (default: 09:31:00)")
    sense_p.add_argument("--checkpoint", default="09:31_EXECUTION", help="Checkpoint ID")

    # 2. Record Decision
    record_p = subparsers.add_parser("record", help="Record Micro trade decision plans to DB")
    record_p.add_argument("date", help="Session date (YYYY-MM-DD)")
    record_p.add_argument("--file", help="Path to decisions JSON file")
    record_p.add_argument("--json", help="Raw JSON string of decisions")
    record_p.add_argument("--thesis", default="", help="AI Session Thesis")

    # 3. Simulate
    sim_p = subparsers.add_parser("simulate", help="Simulate limit execution & outcomes for recorded decisions")
    sim_p.add_argument("date", help="Session date (YYYY-MM-DD)")
    sim_p.add_argument("--time", default="09:31:00", help="Order placement time")

    # 4. Review
    rev_p = subparsers.add_parser("review", help="Record EOD review and update rolling memory")
    rev_p.add_argument("date", help="Session date (YYYY-MM-DD)")
    rev_p.add_argument("--file", help="Path to forensics JSON file")
    rev_p.add_argument("--summary", default="", help="Summary text of lessons learned")

    args = parser.parse_args()
    brain = MicroBrain()

    if args.command == "sense":
        pkt = brain.build_sensory_packet(args.date, as_of_time=args.time, checkpoint=args.checkpoint)
        print(json.dumps(asdict(pkt), indent=2, default=str))

    elif args.command == "record":
        if args.file:
            with open(args.file, "r") as f:
                decisions_payload = json.load(f)
        elif args.json:
            decisions_payload = json.loads(args.json)
        else:
            print("Error: Must provide --file or --json")
            sys.exit(1)

        pkt = brain.build_sensory_packet(args.date)
        brain.record_decision(
            session_date=args.date,
            decisions=decisions_payload,
            sensory_features=asdict(pkt),
            ai_thesis=args.thesis or decisions_payload.get("ai_session_thesis", "")
        )
        print(f" Recorded Micro execution decisions for {args.date}")

    elif args.command == "simulate":
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT decisions FROM quant.brain_sessions WHERE brain_id = 'micro_brain' AND session_date = %s ORDER BY created_at DESC LIMIT 1;", (args.date,))
        row = cur.fetchone()
        if not row or not row[0]:
            print(f"No micro decisions recorded for {args.date}")
            sys.exit(1)

        decisions_data = row[0]
        if isinstance(decisions_data, str):
            decisions_data = json.loads(decisions_data)

        trades_raw = decisions_data.get("selected_trades", [])
        outcomes_list = []
        wins, losses, net_r = 0, 0, 0.0

        for t in trades_raw:
            trade_obj = MicroTradeDecision(
                symbol=t["symbol"], direction=t["direction"], selection_rank=t.get("selection_rank", 1),
                execution_tactic=t.get("execution_tactic", "VWAP_PULLBACK_LIMIT"),
                target_entry_price=float(t["target_entry_price"]), invalidation_price=float(t["invalidation_price"]),
                target_1=float(t["target_1"]), target_2=float(t.get("target_2", t["target_1"])),
                risk_reward_ratio=float(t.get("risk_reward_ratio", 2.0)), thesis=t.get("thesis", "")
            )
            outcome = simulate_micro_execution(trade_obj, args.date, start_time=args.time, conn=conn)
            outcomes_list.append(outcome)
            if outcome.status == "WIN": wins += 1
            elif outcome.status == "STOPPED_OUT" or outcome.status == "LOSS": losses += 1
            net_r += outcome.r_multiple_captured

        total_trades = len(outcomes_list)
        win_rate = round((wins / total_trades) * 100, 1) if total_trades > 0 else 0.0
        outcomes_payload = {
            "total_trades": total_trades, "winning_trades": wins, "losing_trades": losses,
            "win_rate": win_rate, "net_r_multiple": round(net_r, 2),
            "trades": [asdict(o) for o in outcomes_list]
        }
        print(json.dumps(outcomes_payload, indent=2, default=str))

    elif args.command == "review":
        payload = {}
        if args.file:
            with open(args.file, "r") as f:
                payload = json.load(f)
        brain.record_eod_forensics(session_date=args.date, outcomes_payload=payload, forensics_summary=args.summary)
        print(f" Recorded Micro EOD Forensics for {args.date}")

if __name__ == "__main__":
    main()
