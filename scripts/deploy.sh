#!/usr/bin/env bash
# ==============================================================================
# Gidh Intraday - Local Build & Production VM Image Deployment Script
# ==============================================================================
# Builds Linux/AMD64 Docker images locally on your Mac, streams them to the VM,
# and applies/recreates containers instantly with zero build overhead on the VM.
#
# Usage:
#   ./scripts/deploy.sh [target]
#
# Targets:
#   all               Build and deploy both backend and frontend, restart nginx (default)
#   backend | be      Build and deploy backend engine only
#   frontend | fe     Build and deploy frontend cockpit only, restart nginx
#   nginx             Restart nginx reverse proxy only
# ==============================================================================

set -euo pipefail

# Configuration
VM_HOST="manuj@148.230.66.138"
VM_DIR="/home/manuj/workspace/gidh/gidh-intraday"
VM_SUDO_PASS="1912"
COMPOSE_FILE="docker-compose.prod.yml"

# Visual formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

START_TIME=$(date +%s)

TARGET="${1:-all}"
case "$TARGET" in
  all|"")
    BUILD_SERVICES=("backend" "frontend")
    DEPLOY_SERVICES="backend frontend"
    RESTART_NGINX=true
    ;;
  backend|be|api)
    BUILD_SERVICES=("backend")
    DEPLOY_SERVICES="backend"
    RESTART_NGINX=false
    ;;
  frontend|fe|web)
    BUILD_SERVICES=("frontend")
    DEPLOY_SERVICES="frontend"
    RESTART_NGINX=true
    ;;
  nginx)
    BUILD_SERVICES=()
    DEPLOY_SERVICES=""
    RESTART_NGINX=true
    ;;
  *)
    echo -e "${RED}Error: Unknown target '$TARGET'${NC}"
    echo -e "Valid targets: ${CYAN}all | backend | frontend | nginx${NC}"
    exit 1
    ;;
esac

echo -e "${BOLD}${BLUE}====================================================================${NC}"
echo -e "${BOLD}${BLUE}🚀 GIDH PRODUCTION DEPLOYER (Local Build -> VM Apply)${NC}"
echo -e "${BOLD}${BLUE}====================================================================${NC}"
echo -e "Target:   ${CYAN}${TARGET}${NC}"
echo -e "Host:     ${CYAN}${VM_HOST}${NC}"
echo -e "Platform: ${CYAN}linux/amd64${NC}"
echo ""

# Step 1: Local Docker Build
if [ ${#BUILD_SERVICES[@]} -gt 0 ]; then
  echo -e "${BOLD}${YELLOW}[1/3] Building images locally for linux/amd64...${NC}"
  for svc in "${BUILD_SERVICES[@]}"; do
    echo -e "  ⚙️  Building ${CYAN}${svc}${NC}..."
    DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose -f "$COMPOSE_FILE" build "$svc"
  done
  echo -e "  ${GREEN}✓ Local build complete.${NC}\n"

  # Step 2: Stream Images to Remote VM
  echo -e "${BOLD}${YELLOW}[2/3] Streaming built images to production VM (${VM_HOST})...${NC}"
  IMAGE_NAMES=()
  for svc in "${BUILD_SERVICES[@]}"; do
    IMAGE_NAMES+=("gidh-intraday-${svc}:latest")
  done

  echo -e "  📦 Transferring: ${CYAN}${IMAGE_NAMES[*]}${NC}"
  docker save "${IMAGE_NAMES[@]}" | gzip -3 | \
    ssh -o Compression=no "$VM_HOST" "echo $VM_SUDO_PASS | sudo -S docker load"
  echo -e "  ${GREEN}✓ Images loaded into VM Docker daemon.${NC}\n"
else
  echo -e "${BOLD}${YELLOW}[1/2] Skipping image build (nginx restart only)...${NC}\n"
fi

# Step 3: Apply on VM
STEP_NUM="3/3"
if [ ${#BUILD_SERVICES[@]} -eq 0 ]; then
  STEP_NUM="2/2"
fi

echo -e "${BOLD}${YELLOW}[$STEP_NUM] Applying changes on VM...${NC}"

REMOTE_CMDS=()
if [ -n "$DEPLOY_SERVICES" ]; then
  REMOTE_CMDS+=("cd $VM_DIR && echo $VM_SUDO_PASS | sudo -S docker compose -f $COMPOSE_FILE up -d --no-build $DEPLOY_SERVICES")
fi

if [ "$RESTART_NGINX" = true ]; then
  REMOTE_CMDS+=("echo $VM_SUDO_PASS | sudo -S docker restart gidh-nginx")
fi

# Execute remote compose commands
COMBINED_CMD=$(IFS=" && "; echo "${REMOTE_CMDS[*]}")
ssh "$VM_HOST" "$COMBINED_CMD"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${BOLD}${GREEN}====================================================================${NC}"
echo -e "${BOLD}${GREEN}✓ DEPLOYMENT SUCCESSFUL in ${ELAPSED}s${NC}"
echo -e "${BOLD}${GREEN}====================================================================${NC}"
ssh "$VM_HOST" "echo $VM_SUDO_PASS | sudo -S docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
