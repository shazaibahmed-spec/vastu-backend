# VASTU AI — Production Deployment & Update Operations Manual

This document is the **authoritative step-by-step guide** for deploying updates to production across all tiers of the Vastu AI platform:
1. **Backend Engine (NestJS)**
2. **AI Vision Service (FastAPI + YOLOv8)**
3. **Database (Supabase PostgreSQL)**
4. **Mobile Client (React Native iOS / Android)**

---

## 🧭 System Architecture & Production Endpoints

| Tier | Component | Production Host | Live URL / Connection |
| :--- | :--- | :--- | :--- |
| **API** | NestJS Backend | Render (`vastu-backend`) | `https://vastu-backend-udcy.onrender.com/api/v1` |
| **Docs** | OpenAPI Swagger | Render | `https://vastu-backend-udcy.onrender.com/api/docs` |
| **AI Vision** | YOLOv8 Microservice | Render (`vastu-vision-service`) | `https://vastu-vision-service.onrender.com` |
| **Database** | PostgreSQL 16 | Supabase (`vastu-db`) | `aws-0-ap-northeast-2.pooler.supabase.com:5432` |
| **AI LLM** | Gemini 1.5/2.0 Flash | Google AI Cloud | Managed via `GEMINI_API_KEY` |
| **App** | Mobile Client | iOS & Android | Configured in `app/src/api/config.ts` |

---

## 1. Updating the Backend (`backend/`)

Whenever you make changes to controllers, services, Vastu evaluation rules, DTOs, or auth logic:

### Step 1: Verify and Test Locally
Always ensure the TypeScript project compiles cleanly before pushing:
```bash
cd /Volumes/DATA/VASTU/backend
npm run build
npm test
```

### Step 2: Commit and Push to GitHub
```bash
cd /Volumes/DATA/VASTU
git add backend/
git commit -m "feat(backend): describe your backend changes"
git push origin main
```

### Step 3: Automatic Cloud Deployment (Zero Downtime)
- Render automatically detects the new commit on `main`.
- It executes `backend/Dockerfile`, runs tests, builds the production bundle, and swaps the running container without downtime.
- Monitor build progress at: **[dashboard.render.com](https://dashboard.render.com)** ➔ Click `vastu-backend` ➔ **Events / Logs**.

---

## 2. Updating the Vision AI Service (`services/vision-model/`)

Whenever you modify `main.py`, update requirements, tune confidence thresholds, or replace YOLO weights:

### Step 1: Commit and Push
```bash
cd /Volumes/DATA/VASTU
git add services/vision-model/
git commit -m "feat(vision): update YOLO model or detection logic"
git push origin main
```

### Step 2: Render Auto-Build
- Render detects changes under `services/vision-model` and automatically rebuilds the Docker container.
- Healthcheck endpoint to verify: `https://vastu-vision-service.onrender.com/health` (should return `{"status":"ok","isLoaded":true}`).

---

## 3. Updating the Database Schema & Vastu Rules (Supabase)

### Scenario A: You modified `backend/prisma/schema.prisma` (New columns, tables, or relations)
1. **Generate a migration locally**:
   ```bash
   cd /Volumes/DATA/VASTU/backend
   npx prisma migrate dev --name <descriptive_name>
   ```
2. **Apply migration to Supabase Cloud**:
   ```bash
   DATABASE_URL="postgresql://postgres.ewckmzyncduyrrfgyqte:fupmik-2fEbky-jywdit@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" npx prisma migrate deploy
   ```
3. **Commit the new migration file**:
   ```bash
   cd /Volumes/DATA/VASTU
   git add backend/prisma/
   git commit -m "db: migration for <descriptive_name>"
   git push origin main
   ```

### Scenario B: You updated Vastu Rules or Reference Data (`seed.ts`)
Run the seed script against Supabase:
```bash
cd /Volumes/DATA/VASTU/backend
DATABASE_URL="postgresql://postgres.ewckmzyncduyrrfgyqte:fupmik-2fEbky-jywdit@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" npm run db:seed
```

---

## 4. Updating the Mobile App (`app/`)

Whenever you change UI screens, navigation, translations (`locales/`), or state stores:

### Step 1: Verify API Target
Check `app/src/api/config.ts` line 22 to confirm it points to your intended backend:
- **For 100% Cloud Production**:
  ```typescript
  const PRODUCTION_URL = 'https://vastu-backend-udcy.onrender.com/api/v1';
  ```
- **For Local Mac Fast Tunnel**:
  ```typescript
  const PRODUCTION_URL = 'https://labs-advise-connecticut-isbn.trycloudflare.com/api/v1';
  ```

---

### Step 2: Deploying to Devices

#### A. Physical iPhone (Connected via USB or Wi-Fi)
```bash
cd /Volumes/DATA/VASTU/app
npm run ios:device
```
*(Or open `app/ios/VastuAI.xcworkspace` in Xcode, select your physical iPhone in the top bar, and press `Cmd + R`).*

#### B. iOS Simulator (Mac)
```bash
cd /Volumes/DATA/VASTU/app
npm run ios
```

#### C. Android Standalone APK (For Client Download & Testing)
To generate an installable `.apk` file for Android:
```bash
cd /Volumes/DATA/VASTU/app/android
./gradlew assembleRelease
```
The installer is generated at:
👉 `app/android/app/build/outputs/apk/release/app-release.apk`
Send this file directly to the client or upload it to **[Appetize.io](https://appetize.io)** for browser-based testing.

---

## 5. Environment Variables Reference Sheet

### Render Service: `vastu-backend`
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `3000` | Port listened by the container |
| `DATABASE_URL` | `postgresql://postgres.ewckmzyncduyrrfgyqte:fupmik-2fEbky-jywdit@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres` | Supabase connection pooler |
| `JWT_SECRET` | `vastu_super_secret_jwt_demo_key_32chars_min` | JWT signature token |
| `API_PREFIX` | `api/v1` | Global API route prefix |
| `CORS_ORIGINS` | `*` | Allows mobile requests |
| `STORAGE_DRIVER` | `local` | Uploaded images storage |
| `STORAGE_LOCAL_DIR` | `/app/uploads` | Path for uploads |
| `VISION_PROVIDER` | `local` | Uses self-hosted YOLO service |
| `LOCAL_VISION_SERVICE_URL` | `https://vastu-vision-service.onrender.com` | Cloud URL of YOLO service |
| `LOCAL_VISION_TIMEOUT_MS` | `60000` | Prevents premature timeouts |
| `LOCAL_VISION_MODEL` | `yolov8n` | Model variant |
| `VISION_FALLBACK_ENABLED` | `true` | Auto-fallback to Gemini if YOLO fails |
| `VISION_FALLBACK_PROVIDER` | `existing` | Uses Gemini on fallback |
| `AI_LLM_PROVIDER` | `gemini` | Natural language report generator |
| `GEMINI_API_KEY` | *(Your Gemini API Key)* | Google AI access |

### Render Service: `vastu-vision-service`
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `LOCAL_VISION_MODEL` | `yolov8n` | Lightweight Nano model |
| `LOCAL_VISION_DEVICE` | `cpu` | Uses CPU inference on cloud instance |
| `PORT` | `8000` | Port for FastAPI / Uvicorn |

---

## 6. Quick Cheat Sheet — "I Made a Change, What Commands Do I Run?"

```bash
# -------------------------------------------------------------
# 1. You updated Backend or Vision Python code:
# -------------------------------------------------------------
cd /Volumes/DATA/VASTU
git add .
git commit -m "feat: description of changes"
git push origin main
# Render automatically rebuilds and deploys in 2-3 minutes!

# -------------------------------------------------------------
# 2. You updated Database Schema:
# -------------------------------------------------------------
cd /Volumes/DATA/VASTU/backend
DATABASE_URL="postgresql://postgres.ewckmzyncduyrrfgyqte:fupmik-2fEbky-jywdit@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" npx prisma migrate deploy

# -------------------------------------------------------------
# 3. You updated Mobile App code and want it on your iPhone:
# -------------------------------------------------------------
cd /Volumes/DATA/VASTU/app
npm run ios:device
```
