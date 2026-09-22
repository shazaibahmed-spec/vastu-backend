# VASTU AI — System Startup Commands & Cheat Sheet

This guide provides the exact terminal commands to launch all components of the Vastu AI platform:
1. **PostgreSQL Database** (Docker container)
2. **YOLOv8 Vision Detection Service** (FastAPI / Python)
3. **NestJS Backend Engine** (Deterministic Vastu Rules + Gemini LLM)
4. **React Native Mobile App** (Metro Bundler + iOS/Android)

---

## 🧭 Service & Port Overview

| Service | Technology | Port | Healthcheck / URL |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL 16 (Docker) | `5432` | `docker ps \| grep vastu_postgres` |
| **Vision Model** | FastAPI + YOLOv8s | `8000` | [http://localhost:8000/health](http://localhost:8000/health) |
| **Backend API** | NestJS + Prisma + Gemini | `3001` (or `3000`) | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) |
| **Mobile App** | React Native (Metro) | `8081` | [http://localhost:8081](http://localhost:8081) |

---

## ⚡ Option A: Quick Automated Start (Script)

You can use the helper script [`./start.sh`](file:///Volumes/DATA/VASTU/start.sh):

```bash
# Make executable (one-time)
chmod +x start.sh

# Start Database + Vision Model + NestJS Backend in the background
./start.sh all

# Or start individual services:
./start.sh db       # Start Postgres Docker
./start.sh vision   # Start Python YOLO service
./start.sh backend  # Start NestJS dev server
./start.sh app      # Start React Native Metro bundler
./start.sh status   # Check status and health of all services
./start.sh stop     # Stop background services
```

---

## 🖥️ Option B: Manual Terminal Tabs (Recommended for Development)

Open 4 terminal tabs or windows in `/Volumes/DATA/VASTU`:

### Tab 1: PostgreSQL Database (Docker)
```bash
cd /Volumes/DATA/VASTU/backend
docker compose up -d postgres
```
> **Verify**: `docker ps | grep vastu_postgres` (should report `healthy` on port 5432)

---

### Tab 2: YOLO Vision Detection Service (Python / FastAPI)
```bash
cd /Volumes/DATA/VASTU/services/vision-model

# Activate existing Python 3.11 virtual environment
source venv/bin/activate

# Launch FastAPI server with Apple Silicon MPS / CPU acceleration
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
> **Verify**: Open [http://localhost:8000/health](http://localhost:8000/health) in browser. Should return:
> `{"status":"ok","model":"yolov8s","device":"mps","isLoaded":true}`

---

### Tab 3: NestJS Backend API (TypeScript)
```bash
cd /Volumes/DATA/VASTU/backend

# Install dependencies (if newly cloned)
npm install

# Run database migrations & seed (if first time)
npx prisma migrate dev
npm run db:seed

# Start NestJS development server with file watch
npm run start:dev
```
> **Verify**: Open Swagger Docs at [http://localhost:3001/api/docs](http://localhost:3001/api/docs) (or port `3000`)

---

### Tab 4: React Native Mobile App
```bash
cd /Volumes/DATA/VASTU/app

# Start Metro Bundler
npm start

# In a new tab/prompt, run the iOS app:
npm run ios

# Or run directly on your connected physical iPhone:
npm run ios:device

# Or run Android:
npm run android
```

---

## 🔍 Verification & Health Check Commands

Run these quick one-liners from any terminal to verify all services are responsive:

```bash
# 1. Check PostgreSQL connection
pg_isready -h localhost -p 5432 -U postgres

# 2. Check Vision Model health
curl -s http://localhost:8000/health | jq .

# 3. Check Backend API status
curl -s http://localhost:3001/api/v1/analysis | jq .

# 4. Check active ports
lsof -iTCP:5432,8000,3001,8081 -sTCP:LISTEN
```

---

## 🛑 Useful Troubleshooting Commands

### If Port is Stuck or Already in Use:
```bash
# Kill whatever is holding port 8000 (Vision)
lsof -ti :8000 | xargs kill -9

# Kill whatever is holding port 3001 or 3000 (Backend)
lsof -ti :3001,3000 | xargs kill -9

# Kill Metro bundler (Port 8081)
lsof -ti :8081 | xargs kill -9
```

### If Prisma Schema Changes:
```bash
cd /Volumes/DATA/VASTU/backend
npx prisma generate
npx prisma migrate dev --name <migration_name>
```

### Run Tests:
```bash
# Run all backend unit & state machine tests
cd /Volumes/DATA/VASTU/backend
npm test

# Run accuracy benchmark evaluation for Vision model
cd /Volumes/DATA/VASTU
python3 evaluation/evaluate_accuracy.py --endpoint http://localhost:8000/detect
```
