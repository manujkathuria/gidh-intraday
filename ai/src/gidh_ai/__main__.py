from __future__ import annotations

import argparse
import json
import sys
from datetime import date

from gidh_ai.client import MarketClient
from gidh_ai.research import SessionResearch
from gidh_ai.research.focus import POLICY_VERSION, rank_daily_focus


def main() -> None:
    parser = argparse.ArgumentParser(description="Read backend-published Gidh market facts")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("sessions")
    daily = commands.add_parser("daily")
    daily.add_argument("session_date")
    intraday = commands.add_parser("intraday")
    intraday.add_argument("session_date")
    intraday.add_argument("symbol")
    intraday.add_argument("--limit", type=int, default=390)
    focus = commands.add_parser("focus")
    focus.add_argument("session_date")
    focus.add_argument("--limit", type=int, default=12)
    directional_pool = commands.add_parser("directional-pool")
    directional_pool.add_argument("--session-date", required=True)
    directional_pool.add_argument("--limit", type=int, default=35)
    directional_select = commands.add_parser("directional-select")
    directional_select.add_argument("--session-date", required=True)
    directional_eod = commands.add_parser("directional-eod")
    directional_eod.add_argument("--session-date", required=True)
    selector = commands.add_parser("daily-stock-selector")
    selector.add_argument("mode", choices=["inception"])
    selector.add_argument("--session-date", required=True)
    selector.add_argument("--limit", type=int, default=15)
    args = parser.parse_args()

    if args.command == "sessions":
        result = SessionResearch(MarketClient.from_environment()).sessions()
    elif args.command == "daily":
        result = SessionResearch(MarketClient.from_environment()).daily_snapshot(args.session_date)
    elif args.command == "intraday":
        result = SessionResearch(MarketClient.from_environment()).intraday_replay(args.session_date, args.symbol, args.limit)
    elif args.command == "focus":
        from gidh_ai.store import PostgresStore

        store = PostgresStore.from_environment()
        session_date = date.fromisoformat(args.session_date)
        feature_run_id, rows = store.published_daily_features(session_date)
        candidates = rank_daily_focus(rows, args.limit)
        result = {"focus_list_id": store.save_focus_list(session_date, feature_run_id, POLICY_VERSION, candidates)}
    elif args.command == "directional-pool":
        from gidh_ai.research.directional_pool import POOL_POLICY_VERSION, build_directional_pool
        from gidh_ai.store import PostgresStore

        store = PostgresStore.from_environment()
        session_date = date.fromisoformat(args.session_date)
        feature_run_id, rows = store.published_daily_features(session_date)
        result = {"policy_version": POOL_POLICY_VERSION, "feature_run_id": feature_run_id, "cards": build_directional_pool(rows, args.limit)}
    elif args.command == "directional-select":
        from gidh_ai.llm import GeminiClient
        from gidh_ai.research.directional_pool import build_directional_pool
        from gidh_ai.research.directional_selector import select
        from gidh_ai.store import PostgresStore
        store = PostgresStore.from_environment()
        session_date = date.fromisoformat(args.session_date)
        feature_run_id, rows = store.published_daily_features(session_date)
        model, cards = GeminiClient.from_environment(), build_directional_pool(rows)
        decisions = select(cards, model)
        result = {"focus_list_id": store.save_directional_decisions(session_date, feature_run_id, decisions, model.model, {"pool": cards, "human_execution_excluded": True})}
    elif args.command == "directional-eod":
        from gidh_ai.llm import GeminiClient
        from gidh_ai.research.replay_analyst import analyse
        from gidh_ai.store import PostgresStore
        store = PostgresStore.from_environment()
        run_id, outcomes = store.evaluate_directional_run(date.fromisoformat(args.session_date))
        learning = analyse(outcomes, GeminiClient.from_environment())
        store.save_directional_learning(run_id, learning)
        result = {"research_run_id": run_id, "learning": learning}
    else:
        from gidh_ai.llm import DeepSeekClient, GeminiClient
        from gidh_ai.research.daily_stock_selector import POLICY_VERSION as SELECTOR_POLICY_VERSION, inception
        from gidh_ai.store import PostgresStore

        store = PostgresStore.from_environment()
        session_date = date.fromisoformat(args.session_date)
        feature_run_id, rows = store.published_daily_features(session_date)
        print(f"[selector] loaded {len(rows)} published symbols for {session_date}", file=sys.stderr, flush=True)
        selection = inception(rows, GeminiClient.from_environment(), DeepSeekClient.from_environment(), args.limit)
        result = {"focus_list_id": store.save_focus_list(session_date, feature_run_id, SELECTOR_POLICY_VERSION, selection.candidates, selection.provenance["model"], selection.provenance)}
    print(json.dumps(result, default=str, indent=2))


if __name__ == "__main__":
    main()
