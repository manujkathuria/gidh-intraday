#!/usr/bin/env python3
"""
Backfill historical memory cards into quant.* Postgres tables.

Usage:
  python3 quant/tools/db_sync.py --day 19
  python3 quant/tools/db_sync.py --all-days
"""

import argparse
import subprocess
import sys
import json
import re
from pathlib import Path

DEFAULT_CONTAINER = "timescaledb-local"
DEFAULT_DB = "gidh_intraday"
DEFAULT_USER = "postgres"


def run_sql(query: str, container: str = DEFAULT_CONTAINER, db: str = DEFAULT_DB, user: str = DEFAULT_USER) -> str:
    cmd = [
        "docker", "exec", container,
        "psql", "-U", user, "-d", db, "-P", "pager=off", "-t", "-A", "-c", query
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error running SQL: {res.stderr}\nQuery was:\n{query}", file=sys.stderr)
        sys.exit(1)
    return res.stdout.strip()


def sync_day(day_num: int):
    # Find matching memory file
    pattern = f"day_{day_num:03d}_*.md"
    mem_files = list(Path("quant/memory").glob(pattern))
    if not mem_files:
        print(f"No memory file found for Day {day_num} (pattern: {pattern})")
        return

    mem_path = mem_files[0]
    content = mem_path.read_text()

    # Parse metadata (support both older and newer card header formats)
    feat_match = re.search(r"(?:Feature run:|Run ID:)\s*`?([a-f0-9\-]+)`?", content, re.IGNORECASE)
    date_match = re.search(r"(?:Session date:\s*`?(\d{4}-\d{2}-\d{2})`?|Day \d+[:\s\-]+(\d{4}-\d{2}-\d{2}))", content, re.IGNORECASE)
    inst_match = re.search(r"(?:Instruments:|Instruments Active:)\s*(\d+)", content, re.IGNORECASE)
    bars_match = re.search(r"Intraday bars per instrument:\s*(\d+)", content, re.IGNORECASE)
    next_q_match = re.search(r"The Day \d+ question:\s*\n\s*(?:> )?([^\n]+)", content)

    feature_run_id = feat_match.group(1) if feat_match else None
    
    # Fallback to filename date if not found in content
    if date_match:
        session_date = date_match.group(1) or date_match.group(2)
    else:
        fn_date_match = re.search(r"(\d{4}-\d{2}-\d{2})", mem_path.name)
        session_date = fn_date_match.group(1) if fn_date_match else None

    inst_count = int(inst_match.group(1)) if inst_match else 210
    bars_count = int(bars_match.group(1)) if bars_match else 360
    next_question = next_q_match.group(1).strip() if next_q_match else None

    # Upsert quant.sessions
    feat_sql = f"'{feature_run_id}'::uuid" if feature_run_id else "NULL"
    next_q_sql = f"'{next_question.replace('\'', '\'\'')}'" if next_question else "NULL"
    
    session_sql = f"""
    INSERT INTO quant.sessions (
      mode, day_number, session_date, feature_run_id, status,
      instruments_count, bars_per_instrument, memory_file_path, next_question, created_by
    )
    VALUES (
      'replay', {day_num}, DATE '{session_date}', {feat_sql}, 'complete',
      {inst_count}, {bars_count}, '{mem_path}', {next_q_sql}, 'antigravity'
    )
    ON CONFLICT (mode, day_number)
    DO UPDATE SET
      session_date = EXCLUDED.session_date,
      feature_run_id = EXCLUDED.feature_run_id,
      status = EXCLUDED.status,
      instruments_count = EXCLUDED.instruments_count,
      bars_per_instrument = EXCLUDED.bars_per_instrument,
      memory_file_path = EXCLUDED.memory_file_path,
      next_question = EXCLUDED.next_question,
      updated_at = now()
    RETURNING id;
    """
    session_id_raw = run_sql(session_sql)
    session_id_match = re.search(r"\b(\d+)\b", session_id_raw)
    if not session_id_match:
        print(f"Could not parse session_id from: {session_id_raw}")
        return
    session_id = session_id_match.group(1)
    print(f"Synced quant.sessions for Day {day_num} ({session_date}) -> Session ID: {session_id}")

    # Delete existing trades and lessons for session to re-sync cleanly
    run_sql(f"DELETE FROM quant.trades WHERE session_id = {session_id};")
    run_sql(f"DELETE FROM quant.lessons WHERE session_id = {session_id};")

    # Sync Session-Level Macro Lesson
    mem_lesson_match = re.search(r"Memory:\s*([^\n]+(?:\n[^\n#]+)*)", content)
    if mem_lesson_match:
        mem_lesson_text = mem_lesson_match.group(1).strip().replace("'", "''")
        lesson_sql = f"""
        INSERT INTO quant.lessons (session_id, lesson_type, lesson, confidence, active, created_by)
        VALUES ({session_id}, 'market', '{mem_lesson_text}', 0.9, true, 'antigravity');
        """
        run_sql(lesson_sql)

    # Sync Strategic Takeaways if present
    takeaways_match = re.search(r"## Strategic Takeaways\s*\n(.*?)(?=\nThe Day|\Z)", content, re.DOTALL)
    if takeaways_match:
        takeaway_items = re.findall(r"\d+\.\s+\*\*([^\*]+)\*\*:\s*([^\n]+(?:\n(?!\d+\.)[^\n]+)*)", takeaways_match.group(1))
        for title, text in takeaway_items:
            clean_lesson = f"{title.strip()}: {text.strip()}".replace("'", "''")
            l_type = "battalion" if "battalion" in title.lower() else "execution" if "scout" in title.lower() or "exit" in title.lower() else "tactic"
            run_sql(f"""
            INSERT INTO quant.lessons (session_id, lesson_type, lesson, confidence, active, created_by)
            VALUES ({session_id}, '{l_type}', '{clean_lesson}', 0.95, true, 'antigravity');
            """)

    # Parse Trades from markdown ledger
    trade_blocks = re.findall(r"### Trade \d+[:\s\-]+([^\n]+)\n(.*?)(?=\n###|\n##|\Z)", content, re.DOTALL)
    for header, block in trade_blocks:
        tactic_match = re.search(r"`?(TACTIC_[A-Za-z0-9_]+)`?", header) or re.search(r"`?(TACTIC_[A-Za-z0-9_]+)`?", block)
        tactic = tactic_match.group(1) if tactic_match else "TACTIC_PALADIN_RUSH"

        side_match = re.search(r"\b(LONG|SHORT)\b", header, re.IGNORECASE) or re.search(r"Side:\s*(Long|Short)", block, re.IGNORECASE)
        side = side_match.group(1).lower() if side_match else "long"

        sym_match = re.search(r"(?:LONG|SHORT)\s+`?([A-Za-z0-9&_\-]+)`?", header, re.IGNORECASE) or re.search(r"^([A-Za-z0-9&_\-]+)", header.strip()) or re.search(r"`?([A-Z0-9&_\-]{3,})`?", header) or re.search(r"symbol:\s*`?([A-Za-z0-9&_\-]+)`?", block, re.IGNORECASE)
        symbol = sym_match.group(1).strip() if sym_match else None

        entry_px_match = re.search(r"Entry(?:\s+price)?:\s*(?:[\d:]+,\s*price\s*|@\s*\*\*?)?([\d\.,]+)", block)
        pos_val_match = re.search(r"Position value:\s*([\d,]+)", block)
        inv_match = re.search(r"Invalidation(?:\s+Rule)?:\s*([^\n]+)", block)
        plan_exit_match = re.search(r"Planned exit(?:\s+window)?:\s*([^\n]+)", block)
        act_exit_match = re.search(r"(?:Actual exit reason|Exit Reason):\s*([^\n]+)", block)
        exit_px_match = re.search(r"(?:Actual Exit|Exit):\s*(?:[\d:]+\s*(?:close)?,\s*price\s*|[\d:]+\s*@\s*\*\*?)?([\d\.,]+)", block)
        res_match = re.search(r"(?:P&L|Result):\s*[\*`]*([+\-]?[\d\.]+)%", block)
        res_inr_match = re.search(r"(?:P&L|Result):[^\n]*?(?:about|~|\()?\s*([+\-]?[\d\.,]+)\s*INR", block)
        label_match = re.search(r"(?:Label|Outcome):\s*[\*`]*([A-Za-z_]+)[\*`]*", block)

        if not symbol or not entry_px_match:
            continue

        raw_entry_str = entry_px_match.group(1).replace(",", "").rstrip('.')
        try:
            entry_price = float(raw_entry_str)
        except ValueError:
            continue
        pos_val = float(pos_val_match.group(1).replace(",", "")) if pos_val_match else 10000.0
        invalidation = inv_match.group(1).strip().replace("'", "''") if inv_match else None
        planned_exit = plan_exit_match.group(1).strip().replace("'", "''") if plan_exit_match else None
        actual_exit_reason = act_exit_match.group(1).strip().replace("'", "''") if act_exit_match else None
        exit_price = float(exit_px_match.group(1).rstrip('.')) if exit_px_match else None
        res_pct = float(res_match.group(1)) if res_match else None
        
        # Determine res_inr
        if res_inr_match:
            res_inr = float(res_inr_match.group(1))
        elif res_pct is not None:
            res_inr = round(res_pct * (pos_val / 100.0), 2)
        else:
            res_inr = None
        label = label_match.group(1).strip() if label_match else ("WIN" if (res_pct or 0) > 0 else "LOSS")
        if label not in ('WIN', 'LOSS', 'SCRATCH', 'GOOD_LOSS', 'BAD_WIN'):
            label = 'LOSS' if 'LOSS' in label else 'SCRATCH' if 'SCRATCH' in label else 'WIN'

        trade_sql = f"""
        INSERT INTO quant.trades (
          session_id, trade_mode, tactic, symbol, side, entry_price, position_value_inr,
          invalidation_rule, planned_exit_rule, exit_reason, actual_exit_price,
          result_pct, result_inr, label
        )
        VALUES (
          {session_id}, 'paper', '{tactic}', '{symbol}', '{side}', {entry_price}, {pos_val},
          {f"'{invalidation}'" if invalidation else "NULL"},
          {f"'{planned_exit}'" if planned_exit else "NULL"},
          {f"'{actual_exit_reason}'" if actual_exit_reason else "NULL"},
          {exit_price if exit_price is not None else "NULL"},
          {res_pct if res_pct is not None else "NULL"},
          {res_inr if res_inr is not None else "NULL"},
          '{label}'
        );
        """
        run_sql(trade_sql)
        pct_str = f"{res_pct:+.2f}%" if res_pct is not None else "N/A"
        print(f"  -> Synced trade: {tactic} {side.upper()} {symbol} ({pct_str})")



def main():
    parser = argparse.ArgumentParser(description="Sync markdown memory cards into quant DB.")
    parser.add_argument("--day", type=int, help="Sync a specific Day number (e.g. 19)")
    parser.add_argument("--all-days", action="store_true", help="Sync all available days in quant/memory")
    args = parser.parse_args()

    if args.day:
        sync_day(args.day)
    elif args.all_days:
        mem_files = sorted(Path("quant/memory").glob("day_*.md"))
        for f in mem_files:
            m = re.search(r"day_(\d+)_", f.name)
            if m:
                sync_day(int(m.group(1)))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
