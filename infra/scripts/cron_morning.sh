#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GIDH INTRADAY — MORNING REFRESH, FEATURE BASELINE & EDGE RESTART CRON (08:45 IST)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"
mkdir -p logs

LOG_FILE="${APP_DIR}/logs/morning-cron.log"
LOCK_FILE="/tmp/gidh-morning.lock"

exec 200>"${LOCK_FILE}"
if command -v flock >/dev/null 2>&1; then
    flock -n 200 || { echo "[WARN] Morning cron is already running. Exiting." >> "${LOG_FILE}"; exit 0; }
fi

echo "" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"
echo " [MORNING CRON] Starting 08:45 IST Token Refresh, Feature Baseline & Service Restart: $(date)" >> "${LOG_FILE}"
echo "================================================================" >> "${LOG_FILE}"

# 1. Run automated TOTP login to refresh KITE_ACCESS_TOKEN in .env
if [ -f "${APP_DIR}/bin/gidh-auth" ]; then
    echo "[1/5] Running ./bin/gidh-auth to refresh Zerodha access token..." >> "${LOG_FILE}"
    "${APP_DIR}/bin/gidh-auth" >> "${LOG_FILE}" 2>&1 || true
else
    echo "[WARN] Missing ${APP_DIR}/bin/gidh-auth utility, attempting container fallback..." >> "${LOG_FILE}"
    docker exec gidh-backend /app/bin/gidh-auth >> "${LOG_FILE}" 2>&1 || true
fi

# 2. Sync universe instruments and rollover futures contracts automatically
echo "[2/5] Syncing active F&O universe instruments and active futures..." >> "${LOG_FILE}"
if [ -f "${APP_DIR}/bin/gidh-batch" ]; then
    "${APP_DIR}/bin/gidh-batch" instruments sync --expected-count 0 >> "${LOG_FILE}" 2>&1 || {
        echo "[WARN] Host instruments sync failed, attempting container execution..." >> "${LOG_FILE}"
        docker exec gidh-backend /app/bin/gidh-batch instruments sync --expected-count 0 >> "${LOG_FILE}" 2>&1 || true
    }
else
    docker exec gidh-backend /app/bin/gidh-batch instruments sync --expected-count 0 >> "${LOG_FILE}" 2>&1 || true
fi

# 3. Publish today's daily feature baseline for all universe instruments
TODAY=$(date +%Y-%m-%d)
echo "[3/5] Publishing daily feature baseline for ${TODAY}..." >> "${LOG_FILE}"
if [ -f "${APP_DIR}/bin/gidh-batch" ]; then
    "${APP_DIR}/bin/gidh-batch" features daily --session-date "${TODAY}" >> "${LOG_FILE}" 2>&1 || {
        echo "[WARN] Host ./bin/gidh-batch failed, attempting container execution..." >> "${LOG_FILE}"
        docker exec gidh-backend /app/bin/gidh-batch features daily --session-date "${TODAY}" >> "${LOG_FILE}" 2>&1 || true
    }
else
    docker exec gidh-backend /app/bin/gidh-batch features daily --session-date "${TODAY}" >> "${LOG_FILE}" 2>&1 || true
fi

# 3. Recreate edge and backend so Compose reloads the refreshed token and binds to today's feature RunID
echo "[3/5] Recreating gidh-edge and gidh-backend with refreshed credentials and feature baseline..." >> "${LOG_FILE}"
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate edge backend >> "${LOG_FILE}" 2>&1

# 4. Reload Nginx so upstream DNS/IP mapping for edge is updated immediately
echo "[4/5] Reloading Nginx reverse proxy..." >> "${LOG_FILE}"
docker exec gidh-nginx nginx -s reload >> "${LOG_FILE}" 2>&1 || docker restart gidh-nginx >> "${LOG_FILE}" 2>&1

# 5. Health check verification loop (up to 20s)
echo "[5/5] Verifying edge & backend health..." >> "${LOG_FILE}"
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
