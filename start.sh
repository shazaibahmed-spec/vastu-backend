#!/usr/bin/env bash

# ==============================================================================
# VASTU AI — Unified Startup & Management Script
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
VISION_DIR="${ROOT_DIR}/services/vision-model"
APP_DIR="${ROOT_DIR}/app"

# Text styling
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
RED="\033[0;31m"
CYAN="\033[0;36m"
RESET="\033[0m"

log_info() {
  echo -e "${BLUE}ℹ️  ${1}${RESET}"
}

log_success() {
  echo -e "${GREEN}✅ ${1}${RESET}"
}

log_warn() {
  echo -e "${YELLOW}⚠️  ${1}${RESET}"
}

log_error() {
  echo -e "${RED}❌ ${1}${RESET}"
}

# ------------------------------------------------------------------------------
# 1. Database (PostgreSQL)
# ------------------------------------------------------------------------------
start_db() {
  echo -e "${BOLD}${CYAN}=== Starting PostgreSQL Database ===${RESET}"
  cd "${BACKEND_DIR}"
  if command -v docker &> /dev/null; then
    docker compose up -d postgres
    log_success "PostgreSQL started on port 5432"
  else
    log_error "Docker is not installed or not in PATH."
    exit 1
  fi
}

# ------------------------------------------------------------------------------
# 2. Vision Model Service (YOLOv8s + FastAPI)
# ------------------------------------------------------------------------------
start_vision() {
  echo -e "${BOLD}${CYAN}=== Starting YOLO Vision Model Service ===${RESET}"
  cd "${VISION_DIR}"

  if [ ! -d "venv" ]; then
    log_info "Creating Python 3.11 virtual environment..."
    python3.11 -m venv venv || python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
  else
    source venv/bin/activate
  fi

  export PYTORCH_ENABLE_MPS_FALLBACK=1
  log_info "Starting FastAPI server on http://localhost:8000 ..."
  python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
}

# ------------------------------------------------------------------------------
# 3. NestJS Backend API
# ------------------------------------------------------------------------------
start_backend() {
  echo -e "${BOLD}${CYAN}=== Starting NestJS Backend API ===${RESET}"
  cd "${BACKEND_DIR}"

  if [ ! -d "node_modules" ]; then
    log_info "Installing backend dependencies..."
    npm install
  fi

  log_info "Starting NestJS in development watch mode..."
  npm run start:dev
}

# ------------------------------------------------------------------------------
# 4. React Native Mobile App
# ------------------------------------------------------------------------------
start_app() {
  echo -e "${BOLD}${CYAN}=== Starting React Native Metro Bundler ===${RESET}"
  cd "${APP_DIR}"

  if [ ! -d "node_modules" ]; then
    log_info "Installing app dependencies..."
    npm install
  fi

  npm start
}

# ------------------------------------------------------------------------------
# 5. Status & Health Checks
# ------------------------------------------------------------------------------
check_status() {
  echo -e "\n${BOLD}${CYAN}=== VASTU AI Service Status ===${RESET}\n"

  # PostgreSQL
  if lsof -iTCP:5432 -sTCP:LISTEN -n -P &> /dev/null; then
    log_success "PostgreSQL:   ONLINE  (Port 5432)"
  else
    log_warn    "PostgreSQL:   OFFLINE (Port 5432)"
  fi

  # YOLO Vision Model
  if lsof -iTCP:8000 -sTCP:LISTEN -n -P &> /dev/null; then
    HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null || echo "error")
    log_success "Vision Model: ONLINE  (Port 8000) -> ${HEALTH}"
  else
    log_warn    "Vision Model: OFFLINE (Port 8000)"
  fi

  # NestJS Backend
  if lsof -iTCP:3001 -sTCP:LISTEN -n -P &> /dev/null; then
    log_success "Backend API:  ONLINE  (Port 3001) -> http://localhost:3001/api/docs"
  elif lsof -iTCP:3000 -sTCP:LISTEN -n -P &> /dev/null; then
    log_success "Backend API:  ONLINE  (Port 3000) -> http://localhost:3000/api/docs"
  else
    log_warn    "Backend API:  OFFLINE (Port 3001/3000)"
  fi

  # Metro Bundler
  if lsof -iTCP:8081 -sTCP:LISTEN -n -P &> /dev/null; then
    log_success "Metro App:    ONLINE  (Port 8081)"
  else
    log_warn    "Metro App:    OFFLINE (Port 8081)"
  fi
  echo ""
}

# ------------------------------------------------------------------------------
# 6. Stop Running Services
# ------------------------------------------------------------------------------
stop_services() {
  echo -e "${BOLD}${CYAN}=== Stopping VASTU AI Services ===${RESET}"

  log_info "Stopping Vision Model (Port 8000)..."
  lsof -ti :8000 | xargs kill -9 2>/dev/null || true

  log_info "Stopping Backend API (Port 3001/3000)..."
  lsof -ti :3001,3000 | xargs kill -9 2>/dev/null || true

  log_info "Stopping Metro Bundler (Port 8081)..."
  lsof -ti :8081 | xargs kill -9 2>/dev/null || true

  log_info "Stopping PostgreSQL container..."
  cd "${BACKEND_DIR}" && docker compose stop postgres 2>/dev/null || true

  log_success "All services stopped."
}

# ------------------------------------------------------------------------------
# 7. Start All Core Services (Background)
# ------------------------------------------------------------------------------
start_all() {
  echo -e "${BOLD}${CYAN}=== Launching VASTU AI Core Stack ===${RESET}\n"

  start_db
  sleep 2

  echo -e "\n${BOLD}${BLUE}Starting Vision Model in background (log: services/vision-model/vision.log)...${RESET}"
  cd "${VISION_DIR}"
  source venv/bin/activate
  export PYTORCH_ENABLE_MPS_FALLBACK=1
  nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > "${VISION_DIR}/vision.log" 2>&1 &

  echo -e "${BOLD}${BLUE}Starting NestJS Backend in background (log: backend/backend.log)...${RESET}"
  cd "${BACKEND_DIR}"
  nohup npm run start:dev > "${BACKEND_DIR}/backend.log" 2>&1 &

  sleep 4
  check_status

  echo -e "${BOLD}${GREEN}To start the React Native mobile app:${RESET}"
  echo -e "  cd ${APP_DIR} && npm start"
  echo -e "  (or run: ./start.sh app)\n"
}

# ------------------------------------------------------------------------------
# CLI Router
# ------------------------------------------------------------------------------
case "${1}" in
  all)
    start_all
    ;;
  db)
    start_db
    ;;
  vision)
    start_vision
    ;;
  backend)
    start_backend
    ;;
  app)
    start_app
    ;;
  status)
    check_status
    ;;
  stop)
    stop_services
    ;;
  *)
    echo -e "${BOLD}VASTU AI — Control Script${RESET}"
    echo -e "Usage: ./start.sh [command]\n"
    echo -e "Commands:"
    echo -e "  ${GREEN}all${RESET}      Start Database, Vision Model, and Backend API in background"
    echo -e "  ${GREEN}db${RESET}       Start PostgreSQL container via Docker Compose"
    echo -e "  ${GREEN}vision${RESET}   Run the Python YOLOv8 FastAPI service in the foreground"
    echo -e "  ${GREEN}backend${RESET}  Run NestJS backend in development watch mode"
    echo -e "  ${GREEN}app${RESET}      Run React Native Metro bundler"
    echo -e "  ${GREEN}status${RESET}   Check health and port status of all components"
    echo -e "  ${GREEN}stop${RESET}     Stop all background processes and containers"
    echo -e "\nFor manual commands and documentation, see ${CYAN}STARTUP.md${RESET}.\n"
    exit 0
    ;;
esac
