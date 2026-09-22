#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GIDH INTRADAY — MORNING REFRESH & EDGE RESTART CRON (08:45 IST)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"
mkdir -p logs

LOG_FILE="${APP_DIR}/logs/morning-cron.log"

echo "" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
echo " [MORNING CRON] Starting 08:45 IST Token Refresh & Edge Check: $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"

# 1. Run automated TOTP login to refresh KITE_ACCESS_TOKEN in .env
if [ -f "${APP_DIR}/bin/gidh-auth" ]; then
    echo "[1/3] Running ./bin/gidh-auth to refresh Zerodha access token..." >> "${LOG_FILE}"
    "${APP_DIR}/bin/gidh-auth" >> "${LOG_FILE}" 2>&1 || true
else
    echo "[ERROR] Missing ${APP_DIR}/bin/gidh-auth utility." >> "${LOG_FILE}"
    exit 1
fi

# 2. Recreate edge and backend so Compose reloads the refreshed token from .env.
echo "[2/3] Recreating gidh-edge and gidh-backend with refreshed credentials..." >> "${LOG_FILE}"
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate edge backend >> "${LOG_FILE}" 2>&1

# 3. Health check verification loop (up to 20s)
echo "[3/3] Verifying edge & backend health..." >> "${LOG_FILE}"
HEALTHY=false
for i in {1..10}; do
    sleep 2
    if docker exec gidh-edge wget -qO- http://127.0.0.1:8080/healthz 2>/dev/null | grep -q 'ok'; then
        HEALTHY=true
        echo "[HEALTH OK] Edge is up, healthy, and connected to stream!" >> "${LOG_FILE}"
        break
    fi
done

if [ "$HEALTHY" = false ]; then
    echo "[HEALTH ERROR] Edge health check failed after restart! Dumping logs:" >> "${LOG_FILE}"
    docker logs --tail 25 gidh-edge >> "${LOG_FILE}" 2>&1
    exit 1
fi

# Verify gidh-backend container is running
if ! docker ps --filter "name=gidh-backend" --filter "status=running" | grep -q gidh-backend; then
    echo "[HEALTH ERROR] Backend container is not running! Dumping logs:" >> "${LOG_FILE}"
    docker logs --tail 25 gidh-backend >> "${LOG_FILE}" 2>&1
    exit 1
fi
echo "[HEALTH OK] Backend is up and running!" >> "${LOG_FILE}"

echo "================================================================" >> "${LOG_FILE}"
echo " [MORNING CRON COMPLETED SUCCESSFULLY] $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
