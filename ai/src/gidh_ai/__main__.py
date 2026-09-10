from __future__ import annotations

import argparse
import json

from gidh_ai.client import MarketClient
from gidh_ai.research import SessionResearch


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
    args = parser.parse_args()

    research = SessionResearch(MarketClient.from_environment())
    if args.command == "sessions":
        result = research.sessions()
    elif args.command == "daily":
        result = research.daily_snapshot(args.session_date)
    else:
        result = research.intraday_replay(args.session_date, args.symbol, args.limit)
    print(json.dumps(result, default=str, indent=2))


if __name__ == "__main__":
    main()
