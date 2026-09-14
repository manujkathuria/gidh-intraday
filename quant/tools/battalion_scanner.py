#!/usr/bin/env python3
"""
CLI micro-tool for scanning sector battalions at 09:30 and 09:45 checkpoints.

Surfaces:
- Sector / Group name
- Number of siblings firing (RVOL >= min_rvol and VWAP acceptance)
- Aggregate and individual RVOL, Return from Open, vs VWAP, and CLV
- Leader vs Follower ranking

Usage:
  python3 quant/tools/battalion_scanner.py --day 19 --time 09:30
  python3 quant/tools/battalion_scanner.py --day 20 --time 09:30
"""

import argparse
import subprocess
import sys
from collections import defaultdict

DEFAULT_CONTAINER = "timescaledb-local"
DEFAULT_DB = "gidh_intraday"
DEFAULT_USER = "postgres"

# Static sector / industry mapping for universe instruments
SECTOR_MAP = {
    # Defense & Aerospace
    "HAL": "DEFENSE", "MAZDOCK": "DEFENSE", "COCHINSHIP": "DEFENSE", "BDL": "DEFENSE", "BEL": "DEFENSE",
    
    # Capital Goods & Heavy Electricals
    "CUMMINSIND": "CAPITAL_GOODS", "SIEMENS": "CAPITAL_GOODS", "ABB": "CAPITAL_GOODS", 
    "CGPOWER": "CAPITAL_GOODS", "POWERINDIA": "CAPITAL_GOODS", "GVT&D": "CAPITAL_GOODS", "BOSCHLTD": "AUTO_ANCILLARY",
    
    # Auto & Auto Ancillaries
    "HYUNDAI": "AUTOS", "TVSMOTOR": "AUTOS", "HEROMOTOCO": "AUTOS", "M&M": "AUTOS", "ASHOKLEY": "AUTOS",
    "MARUTI": "AUTOS", "EICHERMOT": "AUTOS", "FORCEMOT": "AUTOS", "TMPV": "AUTOS", "ATHERENERG": "AUTOS",
    "SONACOMS": "AUTO_ANCILLARY", "UNOMINDA": "AUTO_ANCILLARY", "MOTHERSON": "AUTO_ANCILLARY", "BHARATFORG": "AUTO_ANCILLARY", "TIINDIA": "AUTO_ANCILLARY",
    
    # Financials / NBFC / Housing
    "BAJFINANCE": "FINANCIALS_NBFC", "BAJAJFINSV": "FINANCIALS_NBFC", "ABCAPITAL": "FINANCIALS_NBFC", 
    "CHOLAFIN": "FINANCIALS_NBFC", "SHRIRAMFIN": "FINANCIALS_NBFC", "MUTHOOTFIN": "FINANCIALS_NBFC", 
    "MANAPPURAM": "FINANCIALS_NBFC", "LTF": "FINANCIALS_NBFC", "PNBHOUSING": "FINANCIALS_HOUSING", "LICHSGFIN": "FINANCIALS_HOUSING",
    
    # Banking
    "HDFCBANK": "BANKS_PVT", "ICICIBANK": "BANKS_PVT", "KOTAKBANK": "BANKS_PVT", "AXISBANK": "BANKS_PVT", "AUBANK": "BANKS_PVT", "RBLBANK": "BANKS_PVT",
    "SBIN": "BANKS_PSU", "CANBK": "BANKS_PSU", "BANKINDIA": "BANKS_PSU", "UNIONBANK": "BANKS_PSU", "MAHABANK": "BANKS_PSU",
    
    # Insurance & Capital Market Infra
    "LICI": "INSURANCE", "HDFCLIFE": "INSURANCE", "SBILIFE": "INSURANCE", "ICICIPRULI": "INSURANCE", "ICICIGI": "INSURANCE",
    "BSE": "EXCHANGES_DEPO", "MCX": "EXCHANGES_DEPO", "CDSL": "EXCHANGES_DEPO", "CAMS": "EXCHANGES_DEPO", "KFINTECH": "EXCHANGES_DEPO", "ANGELONE": "EXCHANGES_DEPO", "360ONE": "WEALTH", "NAM-INDIA": "WEALTH",
    
    # IT & Tech
    "TCS": "IT_MAJORS", "INFY": "IT_MAJORS", "HCLTECH": "IT_MAJORS", "WIPRO": "IT_MAJORS", "TECHM": "IT_MAJORS",
    "COFORGE": "IT_MIDCAP", "PERSISTENT": "IT_MIDCAP", "MPHASIS": "IT_MIDCAP", "LTM": "IT_MIDCAP", "KPITTECH": "IT_MIDCAP", "OFSS": "IT_MIDCAP",
    
    # Pharma & Healthcare
    "SUNPHARMA": "PHARMA", "CIPLA": "PHARMA", "DRREDDY": "PHARMA", "LUPIN": "PHARMA", "AUROPHARMA": "PHARMA", 
    "DIVISLAB": "PHARMA", "TORNTPHARM": "PHARMA", "GLENMARK": "PHARMA", "LAURUSLABS": "PHARMA", "MANKIND": "PHARMA", "BIOCON": "PHARMA", "ALKEM": "PHARMA",
    "APOLLOHOSP": "HEALTHCARE", "FORTIS": "HEALTHCARE", "MAXHEALTH": "HEALTHCARE",
    
    # Metals & Mining
    "TATASTEEL": "METALS", "JSWSTEEL": "METALS", "JINDALSTEL": "METALS", "HINDALCO": "METALS", 
    "VEDL": "METALS", "NATIONALUM": "METALS", "SAIL": "METALS", "NMDC": "METALS", "HINDZINC": "METALS", "APLAPOLLO": "METALS",
    
    # Energy & Power & Infra
    "RELIANCE": "ENERGY", "ONGC": "ENERGY", "IOC": "ENERGY", "BPCL": "ENERGY", "HINDPETRO": "ENERGY", "GAIL": "ENERGY", "PETRONET": "ENERGY",
    "NTPC": "POWER", "POWERGRID": "POWER", "TATAPOWER": "POWER", "JSWENERGY": "POWER", "NHPC": "POWER", "IREDA": "POWER_RENEW", "SUZLON": "POWER_RENEW", "INOXWIND": "POWER_RENEW", "ADANIGREEN": "POWER_RENEW", "ADANIPOWER": "POWER", "ADANIENSOL": "POWER",
    "RVNL": "RAILWAY_INFRA", "IRFC": "RAILWAY_INFRA",
    
    # Real Estate
    "DLF": "REALTY", "GODREJPROP": "REALTY", "OBEROIRLTY": "REALTY", "LODHA": "REALTY", "PRESTIGE": "REALTY",
    
    # Consumption / FMCG
    "ITC": "FMCG_TOBACCO", "GODFRYPHLP": "FMCG_TOBACCO", "HINDUNILVR": "FMCG", "NESTLEIND": "FMCG", "BRITANNIA": "FMCG", "DABUR": "FMCG", "MARICO": "FMCG", "COLPAL": "FMCG", "GODREJCP": "FMCG", "VBL": "CONSUMER",
    "JUBLFOOD": "CONSUMER_RETAIL", "TRENT": "CONSUMER_RETAIL", "DMART": "CONSUMER_RETAIL", "PAGEIND": "CONSUMER_RETAIL", "NYKAA": "CONSUMER_RETAIL", "PAYTM": "FINTECH", "SWIGGY": "TECH_PLATFORM", "ZOMATO": "TECH_PLATFORM", "ETERNAL": "TECH_PLATFORM"
}


def run_sql(query: str, container: str = DEFAULT_CONTAINER, db: str = DEFAULT_DB, user: str = DEFAULT_USER) -> str:
    cmd = [
        "docker", "exec", container,
        "psql", "-U", user, "-d", db, "-P", "pager=off", "-t", "-A", "-F", ",", "-c", query
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error running SQL: {res.stderr}", file=sys.stderr)
        sys.exit(1)
    return res.stdout


def main():
    parser = argparse.ArgumentParser(description="Scan and identify synchronized sector battalions.")
    parser.add_argument("--day", type=int, required=True, help="1-based day index")
    parser.add_argument("--time", choices=["09:30", "09:45"], default="09:30", help="Screen checkpoint time")
    parser.add_argument("--min-rvol", type=float, default=2.0, help="Minimum RVOL threshold for battalion participation")
    parser.add_argument("--min-siblings", type=int, default=2, help="Minimum number of firing siblings to declare a battalion")
    args = parser.parse_args()

    offset = args.day - 1
    minute = 15 if args.time == "09:30" else 30

    sql = f"""
    WITH dayn AS (
      SELECT id FROM market.feature_runs ORDER BY session_date ASC OFFSET {offset} LIMIT 1
    )
    SELECT
      i.symbol,
      ROUND(((f.cash_close-f.session_open)/NULLIF(f.session_open,0)*100)::numeric,2) AS ret_from_open,
      ROUND(((f.cash_close-f.session_vwap)/NULLIF(f.session_vwap,0)*100)::numeric,2) AS vs_vwap,
      ROUND(f.relative_volume::numeric,2) AS rvol,
      ROUND(f.clv::numeric,2) AS clv,
      CASE WHEN f.cash_close > f.session_vwap THEN 'LONG' ELSE 'SHORT' END AS posture
    FROM market.intraday_features_1m f
    JOIN market.instruments i ON i.id=f.instrument_id
    WHERE f.feature_run_id=(SELECT id FROM dayn)
      AND f.minutes_since_open={minute}
    ORDER BY f.relative_volume DESC;
    """

    raw_data = run_sql(sql).strip().splitlines()
    if not raw_data or raw_data == ['']:
        print("No data returned.")
        return

    long_groups = defaultdict(list)
    short_groups = defaultdict(list)

    for line in raw_data:
        parts = line.split(",")
        if len(parts) < 6:
            continue
        sym, ret_open, vs_vwap, rvol, clv, posture = parts[0], float(parts[1] or 0), float(parts[2] or 0), float(parts[3] or 0), float(parts[4] or 0), parts[5]
        sector = SECTOR_MAP.get(sym, "MISC")
        
        row = {
            "symbol": sym,
            "ret_open": ret_open,
            "vs_vwap": vs_vwap,
            "rvol": rvol,
            "clv": clv
        }

        if posture == "LONG" and rvol >= args.min_rvol and vs_vwap > 0:
            long_groups[sector].append(row)
        elif posture == "SHORT" and rvol >= args.min_rvol and vs_vwap < 0:
            short_groups[sector].append(row)

    print(f"================================================================================")
    print(f"=== BATTALION SCANNER (Day {args.day} @ {args.time} IST, min RVOL >= {args.min_rvol}x) ===")
    print(f"================================================================================\n")

    print("--- LONG BATTALIONS (Synchronized Strength Above VWAP) ---")
    active_longs = 0
    for sector, members in sorted(long_groups.items(), key=lambda x: len(x[1]), reverse=True):
        if sector == "MISC" or len(members) < args.min_siblings:
            continue
        active_longs += 1
        avg_rvol = sum(m["rvol"] for m in members) / len(members)
        avg_ret = sum(m["ret_open"] for m in members) / len(members)
        print(f"\n>> [{sector}] Battalion ({len(members)} siblings firing | Avg RVOL: {avg_rvol:.2f}x | Avg Ret: {avg_ret:+.2f}%)")
        for i, m in enumerate(members, 1):
            role = "LEADER" if i == 1 else "FOLLOWER"
            print(f"   [{role}] {m['symbol']:<12} | Ret: {m['ret_open']:+6.2f}% | vs VWAP: {m['vs_vwap']:+5.2f}% | RVOL: {m['rvol']:5.2f}x | CLV: {m['clv']:.2f}")

    if active_longs == 0:
        print("  (No synchronized long battalions detected meeting criteria)")

    print("\n--- SHORT BATTALIONS (Synchronized Breakdown Below VWAP) ---")
    active_shorts = 0
    for sector, members in sorted(short_groups.items(), key=lambda x: len(x[1]), reverse=True):
        if sector == "MISC" or len(members) < args.min_siblings:
            continue
        active_shorts += 1
        avg_rvol = sum(m["rvol"] for m in members) / len(members)
        avg_ret = sum(m["ret_open"] for m in members) / len(members)
        print(f"\n>> [{sector}] Breakdown Battalion ({len(members)} siblings firing | Avg RVOL: {avg_rvol:.2f}x | Avg Ret: {avg_ret:+.2f}%)")
        for i, m in enumerate(members, 1):
            role = "LEADER" if i == 1 else "FOLLOWER"
            print(f"   [{role}] {m['symbol']:<12} | Ret: {m['ret_open']:+6.2f}% | vs VWAP: {m['vs_vwap']:+5.2f}% | RVOL: {m['rvol']:5.2f}x | CLV: {m['clv']:.2f}")

    if active_shorts == 0:
        print("  (No synchronized short battalions detected meeting criteria)")
    print(f"\n================================================================================")


if __name__ == "__main__":
    main()
