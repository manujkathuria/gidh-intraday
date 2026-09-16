#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GIDH INTRADAY — MODULAR PRODUCTION DEPLOYMENT SCRIPT
# Usage: ./scripts/deploy.sh [all | backend | frontend]
# ==============================================================================

TARGET="${1:-${TARGET:-all}}"
VM_HOST="${VM_HOST:-148.230.66.138}"
VM_USER="${VM_USER:-manuj}"
VM_PATH="${VM_PATH:-/home/manuj/workspace/gidh/gidh-intraday}"

COLOR_RESET="\033[0m"
COLOR_GREEN="\033[1;32m"
COLOR_YELLOW="\033[1;33m"
COLOR_RED="\033[1;31m"
COLOR_CYAN="\033[1;36m"

log_info() { echo -e "${COLOR_CYAN}[DEPLOY INFO]${COLOR_RESET} $1"; }
log_ok()   { echo -e "${COLOR_GREEN}[DEPLOY OK]${COLOR_RESET} $1"; }
log_warn() { echo -e "${COLOR_YELLOW}[DEPLOY WARN]${COLOR_RESET} $1"; }
log_err()  { echo -e "${COLOR_RED}[DEPLOY ERROR]${COLOR_RESET} $1"; }

GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
TAG="prod-${GIT_COMMIT}"

log_info "Target Host   : ${VM_USER}@${VM_HOST}:${VM_PATH}"
log_info "Deploy Target : [${TARGET^^}]"
log_info "Release Tag   : ${TAG}"

# 1. Pre-flight SSH check
log_info "1/5 Verifying SSH connection to ${VM_HOST}..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${VM_USER}@${VM_HOST}" "mkdir -p ${VM_PATH}" >/dev/null 2>&1; then
    log_err "Failed to connect to ${VM_USER}@${VM_HOST} via SSH. Please check your SSH connection."
    exit 1
fi
log_ok "SSH connectivity established."

# 2. Build backend if needed
IMAGES_TO_SAVE=()
if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
    log_info "2/5 Testing & Building Backend (Linux/AMD64)..."
    (cd backend && go test ./...)
    
    mkdir -p bin
    (cd backend && \
        CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ../bin/gidh-auth ./cmd/gidh-auth && \
        CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ../bin/gidh-batch ./cmd/gidh-batch)

    docker buildx build --platform linux/amd64 -t "gidh-intraday-backend:${TAG}" -t "gidh-intraday-backend:latest" ./backend
    IMAGES_TO_SAVE+=("gidh-intraday-backend:latest")
    log_ok "Backend image & CLI binaries built."
fi

# 3. Build frontend if needed
if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
    log_info "Building Frontend (Linux/AMD64)..."
    docker buildx build --platform linux/amd64 -t "gidh-intraday-frontend:${TAG}" -t "gidh-intraday-frontend:latest" ./web
    IMAGES_TO_SAVE+=("gidh-intraday-frontend:latest")
    log_ok "Frontend image built."
fi

# 4. Stream compressed Docker images to remote VM
log_info "3/5 Streaming ${#IMAGES_TO_SAVE[@]} Docker image(s) to remote VM..."
docker save "${IMAGES_TO_SAVE[@]}" | gzip -1 | ssh "${VM_USER}@${VM_HOST}" "gunzip | docker load"
log_ok "Images loaded into remote Docker daemon."

# 5. Sync configs, scripts, and host binaries
log_info "4/5 Syncing configs, scripts, and binaries..."
rsync -avz --exclude '.git' --exclude 'node_modules' --exclude '.venv' \
    docker-compose.prod.yml Makefile scripts bin infra database "${VM_USER}@${VM_HOST}:${VM_PATH}/"
log_ok "Sync completed."

# 6. Restart targeted containers & verify health on VM
log_info "5/5 Updating containers and verifying health on VM..."
ssh "${VM_USER}@${VM_HOST}" bash << EOF
    set -euo pipefail
    cd ${VM_PATH}
    chmod +x scripts/*.sh bin/* 2>/dev/null || true

    if [ "$TARGET" = "backend" ]; then
        docker compose -f docker-compose.prod.yml up -d --no-deps backend
    elif [ "$TARGET" = "frontend" ]; then
        docker compose -f docker-compose.prod.yml up -d --no-deps frontend
    else
        docker compose -f docker-compose.prod.yml up -d --remove-orphans
    fi

    # If backend was updated, run health verification
    if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
        echo "Waiting for Go backend healthcheck..."
        for i in {1..10}; do
            sleep 2
            if docker exec gidh-backend wget -qO- http://127.0.0.1:8080/healthz 2>/dev/null | grep -q 'ok'; then
                echo "[HEALTH OK] Backend is live and healthy!"
                break
            fi
            if [ "\$i" -eq 10 ]; then
                echo "[HEALTH WARN] Backend healthcheck timed out. Inspecting logs:"
                docker logs --tail 30 gidh-backend
                exit 1
            fi
        done
    fi

    docker image prune -f >/dev/null 2>&1 || true
EOF

log_ok "======================================================="
log_ok " [${TARGET^^}] DEPLOYMENT SUCCESSFUL -> ${TAG} ON ${VM_HOST}"
log_ok "======================================================="
