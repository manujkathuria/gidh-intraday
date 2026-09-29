#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GIDH INTRADAY — EOD DATA & INTEGRITY CRON (15:35 IST)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Resolve root directory whether called from scripts/ or infra/scripts/
if [ -d "${SCRIPT_DIR}/../backend" ]; then
    ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
elif [ -d "${SCRIPT_DIR}/../../backend" ]; then
    ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
else
    ROOT_DIR="${SCRIPT_DIR}"
fi

cd "${ROOT_DIR}"
mkdir -p logs

LOG_FILE="${ROOT_DIR}/logs/eod-cron.log"
LOCK_FILE="/tmp/gidh-eod.lock"

exec 200>"${LOCK_FILE}"
if command -v flock >/dev/null 2>&1; then
    flock -n 200 || { echo "[WARN] EOD pipeline is already running. Exiting." >> "${LOG_FILE}"; exit 0; }
fi

echo "" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
echo " [EOD CRON] Starting 15:35 IST EOD Pipeline: $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"

# 1. Refresh auth token if needed
if [ -f "${ROOT_DIR}/bin/gidh-auth" ]; then
    "${ROOT_DIR}/bin/gidh-auth" >> "${LOG_FILE}" 2>&1 || true
elif [ -f "${ROOT_DIR}/backend/bin/gidh-auth" ]; then
    "${ROOT_DIR}/backend/bin/gidh-auth" >> "${LOG_FILE}" 2>&1 || true
elif docker ps --filter "name=gidh-backend" --filter "status=running" | grep -q gidh-backend; then
    docker exec gidh-backend /app/bin/gidh-auth >> "${LOG_FILE}" 2>&1 || true
fi

# 2. Run EOD Batch Pipeline
echo "[1/2] Running gidh-batch eod..." >> "${LOG_FILE}"
if [ -f "${ROOT_DIR}/bin/gidh-batch" ]; then
    "${ROOT_DIR}/bin/gidh-batch" eod "$@" >> "${LOG_FILE}" 2>&1
elif [ -f "${ROOT_DIR}/backend/bin/gidh-batch" ]; then
    "${ROOT_DIR}/backend/bin/gidh-batch" eod "$@" >> "${LOG_FILE}" 2>&1
elif docker ps --filter "name=gidh-backend" --filter "status=running" | grep -q gidh-backend; then
    docker exec gidh-backend /app/bin/gidh-batch eod "$@" >> "${LOG_FILE}" 2>&1
else
    echo "[ERROR] Missing gidh-batch binary at ${ROOT_DIR}/bin/gidh-batch or ${ROOT_DIR}/backend/bin/gidh-batch." >> "${LOG_FILE}"
    exit 1
fi

echo "================================================================" >> "${LOG_FILE}"
echo " [EOD CRON COMPLETED SUCCESSFULLY] $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
