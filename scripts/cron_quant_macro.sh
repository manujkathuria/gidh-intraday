#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GIDH QUANT — STEP 1 MACRO INFLOW & FUEL CRON PIPELINE (PRODUCTION VM)
# Scheduled on VM at 16:00 IST (after NSE daily futures EOD settlement)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"
mkdir -p "${APP_DIR}/logs"

LOG_FILE="${APP_DIR}/logs/quant-macro-cron.log"
LOCK_FILE="/tmp/gidh-quant-macro.lock"

# Concurrency lock on VM
exec 201>"${LOCK_FILE}"
if command -v flock >/dev/null 2>&1; then
    flock -n 201 || { echo "[WARN] Quant Macro pipeline is already running. Exiting." >> "${LOG_FILE}"; exit 0; }
fi

TARGET_DATE="${1:-$(date +%Y-%m-%d)}"

echo "" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
echo " [QUANT MACRO CRON] Starting Step 1 Macro Pipeline for ${TARGET_DATE}: $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"

# Locate Python binary on VM
PYTHON_BIN="python3"
if [ -f "${APP_DIR}/.venv/bin/python" ]; then
    PYTHON_BIN="${APP_DIR}/.venv/bin/python"
elif [ -f "/home/manuj/.venv/bin/python" ]; then
    PYTHON_BIN="/home/manuj/.venv/bin/python"
fi

# 1. Run Step 1 Macro Pipeline & Persist Picks to `quant.macro_daily_picks`
echo "[1/2] Running Step 1 Macro Inflow & Fuel Pipeline using ${PYTHON_BIN}..." >> "${LOG_FILE}"
PYTHONPATH=. "${PYTHON_BIN}" -m quant.towncenter macro "${TARGET_DATE}" >> "${LOG_FILE}" 2>&1

# 2. Run Data Integrity Audit
echo "[2/2] Running Data Integrity & Session Coverage Audit..." >> "${LOG_FILE}"
PYTHONPATH=. "${PYTHON_BIN}" -m quant.towncenter audit >> "${LOG_FILE}" 2>&1 || true

echo "================================================================" >> "${LOG_FILE}"
echo " [QUANT MACRO CRON COMPLETED SUCCESSFULLY] $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
