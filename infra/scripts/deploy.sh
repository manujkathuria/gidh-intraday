#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# GIDH INTRADAY — MODULAR REMOTE BUILD & PRODUCTION DEPLOYMENT SCRIPT
# Builds on high-performance Linux AMD64 build server (192.168.68.107)
# Deploys to Production VM (148.230.66.138)
# Usage: ./infra/scripts/deploy.sh [all | server | frontend]
# ==============================================================================

TARGET="${1:-${TARGET:-all}}"
BUILD_HOST="${BUILD_HOST:-192.168.68.107}"
BUILD_USER="${BUILD_USER:-manuj}"
BUILD_PATH="${BUILD_PATH:-/home/manuj/builds/gidh-intraday}"

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
TARGET_UPPER=$(echo "$TARGET" | tr '[:lower:]' '[:upper:]')

log_info "Build Server  : ${BUILD_USER}@${BUILD_HOST}:${BUILD_PATH}"
log_info "Target Host   : ${VM_USER}@${VM_HOST}:${VM_PATH}"
log_info "Deploy Target : [${TARGET_UPPER}]"
log_info "Release Tag   : ${TAG}"

# 1. Pre-flight SSH check
log_info "1/5 Verifying SSH connectivity to Build Server & Prod VM..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${BUILD_USER}@${BUILD_HOST}" "mkdir -p ${BUILD_PATH}" >/dev/null 2>&1; then
    log_err "Failed to connect to Build Server ${BUILD_USER}@${BUILD_HOST} via SSH."
    exit 1
fi
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${VM_USER}@${VM_HOST}" "mkdir -p ${VM_PATH}" >/dev/null 2>&1; then
    log_err "Failed to connect to Prod VM ${VM_USER}@${VM_HOST} via SSH."
    exit 1
fi
log_ok "SSH connectivity established to both hosts."

# 2. Sync codebase to Build Server
log_info "2/5 Syncing workspace to Build Server..."
rsync -avz --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.venv' \
    --exclude '__pycache__' \
    --exclude '.DS_Store' \
    ./ "${BUILD_USER}@${BUILD_HOST}:${BUILD_PATH}/"
log_ok "Workspace synced to Build Server."

# 3. Build Docker images & Go binaries remotely on Build Server
log_info "3/5 Building Docker images on Linux AMD64 Build Server..."
ssh "${BUILD_USER}@${BUILD_HOST}" bash << EOF
    set -euo pipefail
    cd ${BUILD_PATH}
    mkdir -p bin

    if [ "$TARGET" = "all" ] || [ "$TARGET" = "server" ]; then
        echo "Building Linux AMD64 CLI binaries (gidh-server, gidh-auth, gidh-batch)..."
        (cd backend && \
            CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ../bin/gidh-server ./cmd/gidh-server && \
            CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ../bin/gidh-auth ./cmd/gidh-auth && \
            CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o ../bin/gidh-batch ./cmd/gidh-batch)

        echo "Building gidh-intraday-server:latest..."
        docker build -t "gidh-intraday-server:latest" -t "gidh-intraday-server:${TAG}" ./backend
    fi

    if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
        echo "Building gidh-intraday-frontend:latest..."
        docker build -t "gidh-intraday-frontend:latest" -t "gidh-intraday-frontend:${TAG}" ./web
    fi
EOF
log_ok "Docker images built successfully on Build Server."

# 4. Stream Docker images directly from Build Server to Prod VM
log_info "4/5 Streaming Docker images from Build Server to Prod VM..."
ssh "${BUILD_USER}@${BUILD_HOST}" bash << EOF
    set -euo pipefail
    cd ${BUILD_PATH}

    IMAGES_TO_TRANSFER=()
    if [ "$TARGET" = "all" ] || [ "$TARGET" = "server" ]; then
        IMAGES_TO_TRANSFER+=("gidh-intraday-server:latest")
    fi
    if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
        IMAGES_TO_TRANSFER+=("gidh-intraday-frontend:latest")
    fi

    echo "Saving and streaming \${IMAGES_TO_TRANSFER[*]} to ${VM_HOST}..."
    docker save "\${IMAGES_TO_TRANSFER[@]}" | gzip -1 | ssh -o BatchMode=yes "${VM_USER}@${VM_HOST}" "gunzip | docker load"
EOF
log_ok "Docker images transferred and loaded on Prod VM."

# 5. Sync configs, scripts, and runtime binaries to Prod VM
log_info "5/5 Syncing configs, scripts, and database schema to Prod VM..."
rsync -avz \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.venv' \
    --exclude '__pycache__' \
    --exclude '.DS_Store' \
    Makefile bin infra quant "${VM_USER}@${VM_HOST}:${VM_PATH}/"
log_ok "Production configs synced."

# 6. Restart targeted containers & verify health on VM
log_info "Restarting containers on Prod VM..."
ssh "${VM_USER}@${VM_HOST}" bash << EOF
    set -euo pipefail
    cd ${VM_PATH}
    chmod +x infra/scripts/*.sh bin/* 2>/dev/null || true

    if [ "$TARGET" = "server" ]; then
        docker compose -f infra/deployment/docker-compose.prod.yml up -d --no-deps server nginx
    elif [ "$TARGET" = "frontend" ]; then
        docker compose -f infra/deployment/docker-compose.prod.yml up -d --no-deps frontend nginx
    else
        docker compose -f infra/deployment/docker-compose.prod.yml up -d --remove-orphans
    fi

    # Run health verification
    if [ "$TARGET" = "all" ] || [ "$TARGET" = "server" ]; then
        echo "Verifying Server health on http://127.0.0.1:8080/healthz..."
        for i in {1..12}; do
            sleep 2
            if docker exec gidh-server wget -qO- http://127.0.0.1:8080/healthz 2>/dev/null | grep -q 'ok'; then
                echo "[HEALTH OK] Unified Server is live and healthy!"
                break
            fi
            if [ "\$i" -eq 12 ]; then
                echo "[HEALTH WARN] Server healthcheck timed out. Inspecting logs:"
                docker logs --tail 30 gidh-server
                exit 1
            fi
        done
    fi

    docker image prune -f >/dev/null 2>&1 || true
EOF

log_ok "======================================================="
log_ok " [${TARGET_UPPER}] DEPLOYMENT SUCCESSFUL -> ${TAG} ON ${VM_HOST}"
log_ok "======================================================="
