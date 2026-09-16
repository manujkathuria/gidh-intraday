#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GIDH INTRADAY — MORNING REFRESH & BACKEND RESTART CRON (08:45 IST)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"
mkdir -p logs

LOG_FILE="${APP_DIR}/logs/morning-cron.log"

echo "" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
echo " [MORNING CRON] Starting 08:45 IST Token Refresh & Backend Check: $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"

# 1. Run automated TOTP login to refresh KITE_ACCESS_TOKEN in .env
if [ -f "${APP_DIR}/bin/gidh-auth" ]; then
    echo "[1/3] Running ./bin/gidh-auth to refresh Zerodha access token..." >> "${LOG_FILE}"
    "${APP_DIR}/bin/gidh-auth" >> "${LOG_FILE}" 2>&1 || true
else
    echo "[1/3] Running gidh-auth inside container..." >> "${LOG_FILE}"
    docker exec gidh-backend /app/bin/gidh-auth >> "${LOG_FILE}" 2>&1 || true
fi

# 2. Restart backend container to mount updated .env and open Zerodha WebSocket stream
echo "[2/3] Restarting gidh-backend Docker container..." >> "${LOG_FILE}"
docker restart gidh-backend >> "${LOG_FILE}" 2>&1

# 3. Health check verification loop (up to 20s)
echo "[3/3] Verifying backend health..." >> "${LOG_FILE}"
HEALTHY=false
for i in {1..10}; do
    sleep 2
    if docker exec gidh-backend wget -qO- http://127.0.0.1:8080/healthz 2>/dev/null | grep -q 'ok'; then
        HEALTHY=true
        echo "[HEALTH OK] Backend is up, healthy, and connected to stream!" >> "${LOG_FILE}"
        break
    fi
done

if [ "$HEALTHY" = false ]; then
    echo "[HEALTH ERROR] Backend health check failed after restart! Dumping logs:" >> "${LOG_FILE}"
    docker logs --tail 25 gidh-backend >> "${LOG_FILE}" 2>&1
    exit 1
fi

echo "================================================================" >> "${LOG_FILE}"
echo " [MORNING CRON COMPLETED SUCCESSFULLY] $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
