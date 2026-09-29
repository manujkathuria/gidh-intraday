#!/usr/bin/env bash
# ==============================================================================
# sync_market_data.sh
#
# Syncs market data from the production VM to local MacBook TimescaleDB
# for specific trading dates.
#
# Usage:
#   ./scripts/sync_market_data.sh [YYYY-MM-DD ...]
#   ./scripts/sync_market_data.sh 2026-09-16
#   ./scripts/sync_market_data.sh 2026-09-16 2026-09-17
# ==============================================================================

set -euo pipefail

REMOTE_HOST="manuj@148.230.66.138"
REMOTE_CONTAINER="gidh-timescaledb"
REMOTE_DB="gidh_intraday"

LOCAL_DB="gidh_intraday"
LOCAL_USER="postgres"
LOCAL_HOST="localhost"

DATES=("${@}")
if [ ${#DATES[@]} -eq 0 ]; then
    echo "Usage: $0 <YYYY-MM-DD> [YYYY-MM-DD ...]"
    exit 1
fi

echo "======================================================================"
echo " Starting Market Data Sync from Production (${REMOTE_HOST}) to Local Mac"
echo " Target Dates: ${DATES[*]}"
echo "======================================================================"

# 1. Sync instruments, future_contracts reference tables
echo "==> [1/3] Syncing base reference tables (instruments, future_contracts)..."
ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} pg_dump -U postgres -d ${REMOTE_DB} --data-only --inserts --on-conflict-do-nothing \
    --table=market.instruments \
    --table=market.future_contracts" \
    | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -q

# 2. Sync each requested date
for DATE in "${DATES[@]}"; do
    echo "----------------------------------------------------------------------"
    echo "==> Syncing date: ${DATE}"
    echo "----------------------------------------------------------------------"

    NEXT_DATE=$(date -j -v+1d -f "%Y-%m-%d" "${DATE}" "+%Y-%m-%d" 2>/dev/null || date -d "${DATE} + 1 day" "+%Y-%m-%d")
    TS_START="${DATE} 00:00:00+05:30"
    TS_END="${NEXT_DATE} 00:00:00+05:30"

    echo " -> Clearing existing local data for ${DATE}..."
    psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "
        DELETE FROM market.cash_candles_1d WHERE session_date = '${DATE}';
        DELETE FROM market.future_candles_1d WHERE session_date = '${DATE}';
        DELETE FROM market.cash_candles_1m WHERE ts >= '${TS_START}' AND ts < '${TS_END}';
        DELETE FROM market.future_candles_1m WHERE ts >= '${TS_START}' AND ts < '${TS_END}';
        DELETE FROM market.intraday_features_1m WHERE ts >= '${TS_START}' AND ts < '${TS_END}';
        DELETE FROM market.daily_features WHERE feature_run_id IN (SELECT id FROM market.feature_runs WHERE session_date = '${DATE}');
        DELETE FROM market.data_readiness WHERE session_date = '${DATE}';
        DELETE FROM market.feature_runs WHERE session_date = '${DATE}';
    "

    # A. Sync feature_runs for this date
    echo " -> market.feature_runs"
    ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} psql -U postgres -d ${REMOTE_DB} -c \"COPY (SELECT * FROM market.feature_runs WHERE session_date = '${DATE}') TO STDOUT WITH (FORMAT csv);\"" \
        | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "COPY market.feature_runs FROM STDIN WITH (FORMAT csv);"

    # B. Daily cash & future candles
    echo " -> market.cash_candles_1d"
    ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} psql -U postgres -d ${REMOTE_DB} -c \"COPY (SELECT * FROM market.cash_candles_1d WHERE session_date = '${DATE}') TO STDOUT WITH (FORMAT csv);\"" \
        | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "COPY market.cash_candles_1d FROM STDIN WITH (FORMAT csv);"

    echo " -> market.future_candles_1d"
    ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} psql -U postgres -d ${REMOTE_DB} -c \"COPY (SELECT * FROM market.future_candles_1d WHERE session_date = '${DATE}') TO STDOUT WITH (FORMAT csv);\"" \
        | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "COPY market.future_candles_1d FROM STDIN WITH (FORMAT csv);"

    # C. Minute cash & future candles
    echo " -> market.cash_candles_1m"
    ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} psql -U postgres -d ${REMOTE_DB} -c \"COPY (SELECT * FROM market.cash_candles_1m WHERE ts >= '${TS_START}' AND ts < '${TS_END}') TO STDOUT WITH (FORMAT csv);\"" \
        | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "COPY market.cash_candles_1m FROM STDIN WITH (FORMAT csv);"

    echo " -> market.future_candles_1m"
    ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} psql -U postgres -d ${REMOTE_DB} -c \"COPY (SELECT * FROM market.future_candles_1m WHERE ts >= '${TS_START}' AND ts < '${TS_END}') TO STDOUT WITH (FORMAT csv);\"" \
        | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "COPY market.future_candles_1m FROM STDIN WITH (FORMAT csv);"

    # D. Intraday features 1m (explicit column mapping)
    echo " -> market.intraday_features_1m"
    COLS="ts, feature_run_id, instrument_id, cash_source_ts, future_source_ts, cash_is_complete, future_is_complete, cash_open, cash_high, cash_low, cash_close, session_open, session_high, session_low, minutes_since_open, opening_range_15_high, opening_range_15_low, opening_range_30_high, opening_range_30_low, session_vwap, vwap_sigma, vwap_upper_1, vwap_lower_1, vwap_upper_2, vwap_lower_2, vwap_distance_sigma, bar_range, bar_body, clv, upper_wick_pct, lower_wick_pct, cumulative_volume, expected_cumulative_volume, relative_volume, realised_volatility_5m, realised_volatility_15m, realised_volatility_30m, session_range_pct_atr, adr_fuel_used_pct, future_contract_id, future_close, futures_basis, futures_basis_pct, oi_change_1m, oi_change_5m, oi_change_15m, oi_change_session"
    ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} psql -U postgres -d ${REMOTE_DB} -c \"COPY (SELECT ${COLS} FROM market.intraday_features_1m WHERE ts >= '${TS_START}' AND ts < '${TS_END}') TO STDOUT WITH (FORMAT csv);\"" \
        | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "COPY market.intraday_features_1m (${COLS}) FROM STDIN WITH (FORMAT csv);"

    # E. Daily features
    echo " -> market.daily_features"
    ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} psql -U postgres -d ${REMOTE_DB} -c \"COPY (SELECT df.* FROM market.daily_features df JOIN market.feature_runs fr ON df.feature_run_id = fr.id WHERE fr.session_date = '${DATE}') TO STDOUT WITH (FORMAT csv);\"" \
        | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "COPY market.daily_features FROM STDIN WITH (FORMAT csv);"

    # F. Data readiness
    echo " -> market.data_readiness"
    ssh "${REMOTE_HOST}" "docker exec ${REMOTE_CONTAINER} psql -U postgres -d ${REMOTE_DB} -c \"COPY (SELECT * FROM market.data_readiness WHERE session_date = '${DATE}') TO STDOUT WITH (FORMAT csv);\"" \
        | psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -c "COPY market.data_readiness FROM STDIN WITH (FORMAT csv);"

    echo "==> Completed sync for ${DATE}"
done

echo "======================================================================"
echo " Sync Summary Verification on Local Mac:"
for DATE in "${DATES[@]}"; do
    psql -h "${LOCAL_HOST}" -U "${LOCAL_USER}" -d "${LOCAL_DB}" -t -A -c "
        SELECT '${DATE} | cash_candles_1m: ' || count(*) FROM market.cash_candles_1m WHERE ts >= '${DATE} 00:00:00+05:30' AND ts < date '${DATE}' + 1
        UNION ALL
        SELECT '${DATE} | future_candles_1m: ' || count(*) FROM market.future_candles_1m WHERE ts >= '${DATE} 00:00:00+05:30' AND ts < date '${DATE}' + 1
        UNION ALL
        SELECT '${DATE} | cash_candles_1d: ' || count(*) FROM market.cash_candles_1d WHERE session_date = '${DATE}'
        UNION ALL
        SELECT '${DATE} | future_candles_1d: ' || count(*) FROM market.future_candles_1d WHERE session_date = '${DATE}'
        UNION ALL
        SELECT '${DATE} | intraday_features_1m: ' || count(*) FROM market.intraday_features_1m WHERE ts >= '${DATE} 00:00:00+05:30' AND ts < date '${DATE}' + 1
        UNION ALL
        SELECT '${DATE} | daily_features: ' || count(*) FROM market.daily_features df JOIN market.feature_runs fr ON df.feature_run_id = fr.id WHERE fr.session_date = '${DATE}'
        UNION ALL
        SELECT '${DATE} | data_readiness: ' || count(*) FROM market.data_readiness WHERE session_date = '${DATE}';
    "
done
echo "======================================================================"
echo "Done!"
