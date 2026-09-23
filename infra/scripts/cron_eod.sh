#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GIDH INTRADAY — EOD DATA & INTEGRITY CRON (15:35 IST)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"
mkdir -p logs

LOG_FILE="${APP_DIR}/logs/eod-cron.log"
LOCK_FILE="/tmp/gidh-eod.lock"

exec 200>"${LOCK_FILE}"
flock -n 200 || { echo "[WARN] EOD pipeline is already running. Exiting." >> "${LOG_FILE}"; exit 0; }

echo "" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
echo " [EOD CRON] Starting 15:35 IST EOD Pipeline: $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"

# 1. Refresh auth token if needed
if [ -f "${APP_DIR}/bin/gidh-auth" ]; then
    "${APP_DIR}/bin/gidh-auth" >> "${LOG_FILE}" 2>&1 || true
    echo "[1/2] Running ./bin/gidh-batch eod..." >> "${LOG_FILE}"
    "${APP_DIR}/bin/gidh-batch" eod >> "${LOG_FILE}" 2>&1
else
    echo "[ERROR] Missing ${APP_DIR}/bin/gidh-auth and gidh-batch utility binaries." >> "${LOG_FILE}"
    exit 1
fi

echo "================================================================" >> "${LOG_FILE}"
echo " [EOD CRON COMPLETED SUCCESSFULLY] $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
