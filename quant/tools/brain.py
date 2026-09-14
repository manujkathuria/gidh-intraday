"""
quant/tools/brain.py
CLI tool to query and inspect the distilled Operating Brain rules from quant.brain_rules.
"""

import argparse
import json
import subprocess
import sys

def run_psql(sql):
    cmd = ["docker", "exec", "-i", "timescaledb-local", "psql", "-U", "postgres", "-d", "gidh_intraday", "-t", "-A"]
    proc = subprocess.run(cmd, input=sql, text=True, capture_output=True)
    if proc.returncode != 0:
        print(f"Error querying brain: {proc.stderr}", file=sys.stderr)
        return []
    return proc.stdout.strip().split("\n")

def list_categories():
    sql = "SELECT category, count(*), round(avg(confidence), 2) FROM quant.brain_rules WHERE status = 'ACTIVE' GROUP BY category ORDER BY category;"
    rows = run_psql(sql)
    print("\n" + "="*60)
    print(" GIDH DISTILLED OPERATING BRAIN — ACTIVE RULES")
    print("="*60)
    print(f"{'CATEGORY':<16} | {'ACTIVE RULES':<14} | {'AVG CONFIDENCE'}")
    print("-"*60)
    for r in rows:
        if not r or '|' not in r:
            continue
        cat, count, conf = r.split('|')
        print(f"{cat:<16} | {count:<14} | {conf}")
    print("="*60 + "\n")

def list_rules(category=None):
    where = "WHERE status = 'ACTIVE'"
    if category:
        where += f" AND category = '{category.upper()}'"
    sql = f"""
    SELECT rule_id, category, name, confidence, action, invalidation, condition_json
    FROM quant.brain_rules
    {where}
    ORDER BY category, confidence DESC, rule_id;
    """
    rows = run_psql(sql)
    print("\n" + "="*80)
    print(f" OPERATING BRAIN RULES ({category.upper() if category else 'ALL'})")
    print("="*80)
    for r in rows:
        if not r or '|' not in r:
            continue
        parts = r.split('|')
        rule_id, cat, name, conf, action, inv, cond = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6]
        print(f"\n▶ [{cat}] {rule_id}: {name} (Conf: {conf})")
        try:
            cond_obj = json.loads(cond)
            print(f"  Conditions : {json.dumps(cond_obj, indent=4)}")
        except Exception:
            print(f"  Conditions : {cond}")
        print(f"  Action     : {action}")
        if inv and inv != "NULL":
            print(f"  Invalidate : {inv}")
    print("\n" + "="*80)

def main():
    parser = argparse.ArgumentParser(description="Gidh Operating Brain Inspector")
    parser.add_argument("--category", "-c", help="Filter rules by category (ENTRY, INVALIDATION, HOLD, NO_TRADE, ALLOCATION, CHARACTER, BATTALION)")
    parser.add_argument("--summary", "-s", action="store_true", help="Print category summary count")
    args = parser.parse_args()

    if args.summary:
        list_categories()
    else:
        list_rules(args.category)

if __name__ == "__main__":
    main()
