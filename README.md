# Pothole Patrol

> Crowdsourced road-hazard reporting for NCR residents — snap, verify, dispatch.

Pothole Patrol is a full-stack civic-tech platform that lets residents of Delhi NCR photograph road hazards, validates reports with on-device and server-side ML, surfaces a live danger heatmap, and automatically routes verified reports to the relevant municipal authority (MCD, GDA, NMMC).

**Live backend:** `https://pothole-patrol-production.up.railway.app`  
**API docs (Swagger):** `https://pothole-patrol-production.up.railway.app/api/docs/swagger/`

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Backend](#backend-setup)
  - [Mobile](#mobile-setup)
  - [ML Pipeline](#ml-pipeline-setup)
- [API Reference](#api-reference)
- [ML Pipeline](#ml-pipeline)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Features

### Core
- **Report submission** — GPS-tagged photos submitted from the mobile app with severity selection (Low / Medium / High / Critical)
- **Dual-stage ML verification** — on-device TFLite inference (YOLOv8-nano) gives instant feedback; server-side YOLOv8 re-validates asynchronously via Celery
- **Confidence-based routing** — ≥ 0.70 auto-verifies and dispatches to civic body; 0.50–0.69 queues for human moderation; < 0.50 auto-rejects
- **Report deduplication** — PostGIS `ST_DWithin` prevents duplicate reports within 50 m of an existing verified hazard; upvotes the original instead
- **Live heatmap** — spatial aggregation by bounding box, radius, and severity rendered as a native heat overlay on Google Maps
- **Rate limiting** — Redis-backed counter caps submissions at 20 per user per day

### Civic Dispatch
- Verified reports are formatted and dispatched to the correct municipal body (MCD / GDA / NMMC) via email and REST webhook
- Jurisdiction routing uses PostGIS spatial queries against ward boundary polygons
- Staff-accessible CSV bulk export at `/v1/civic/export/` for offline municipal offices

### Gamification
- Points awarded per verified report (10 pts); badge unlocks at thresholds
- Global leaderboard with pull-to-refresh

### Authentication & Notifications
- Firebase Phone OTP + Google Sign-In — zero password storage
- Firebase ID tokens verified server-side with Firebase Admin SDK
- FCM push notifications on report status changes; stale token cleanup on every send

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile (React Native)                     │
│  Expo Router  │  Zustand  │  NativeWind  │  react-native-maps   │
│  Firebase Auth │ Firebase Storage │ FCM │ TFLite (on-device ML) │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTPS (Firebase Bearer token)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Django REST Framework (v1)                     │
│  FirebaseAuthentication middleware  │  drf-spectacular (OpenAPI)│
│  Reports │ Heatmap │ Gamification │ Notifications │ Civic       │
└──────────────┬──────────────────────────────────────────────────┘
               │  Celery tasks (async)
               ▼
┌──────────────────────────────────────────┐
│             Redis (Celery broker)         │
│  process_report_ml  │  award_points       │
│  send_push_notification  │  civic_dispatch│
└──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────┐     ┌──────────────────────────┐
│  Neon (PostgreSQL   │     │  Firebase (Auth + Storage │
│  + PostGIS)         │     │  + FCM only — no Firestore│
│  Spatial queries    │     └──────────────────────────┘
│  Ward boundaries    │
└─────────────────────┘
```

**Key architectural decisions:**
- Firebase is used **only** for Auth, Storage, and FCM. All application data lives in Neon (PostgreSQL). No Firestore.
- Neon was chosen over Supabase: free tier never pauses, unlimited free projects for dev/staging/prod branches, and native DB branching for safe migrations.
- Every ML call, push notification, and civic dispatch runs as a Celery task — the request/response cycle never blocks on these.

---

## Tech Stack

### Mobile
| Concern | Library |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript (strict) |
| Routing | Expo Router v3 (file-based) |
| State | Zustand |
| Styling | NativeWind v4 (Tailwind utility classes) |
| HTTP | Axios + Firebase token interceptor |
| Maps | react-native-maps (Google Maps, heatmap + markers) |
| Auth | @react-native-firebase/auth + Google Sign-In |
| Storage | @react-native-firebase/storage |
| Push | @react-native-firebase/messaging + expo-notifications |
| On-device ML | react-native-fast-tflite (YOLOv8-nano → TFLite INT8) |
| UI | @gorhom/bottom-sheet, react-native-reanimated |

### Backend
| Concern | Library / Service |
|---|---|
| Framework | Django 5 + Django REST Framework |
| Database | Neon (serverless PostgreSQL + PostGIS) |
| ORM | Django ORM + `dj-database-url` |
| Async queue | Celery 5 + Redis |
| Auth | Firebase Admin SDK (token verification) |
| Server-side ML | YOLOv8-nano via `ultralytics` |
| API docs | drf-spectacular (OpenAPI 3 + Swagger UI) |
| WSGI | Gunicorn + WhiteNoise |
| Deployment | Railway (web + Celery worker + Redis services) |

### ML
| Concern | Tool |
|---|---|
| Training | YOLOv8-nano (ultralytics) |
| Dataset | RDD2022 + Kaggle pothole datasets via Roboflow |
| On-device export | TFLite INT8 (exported from `best.pt`) |
| Evaluation | mAP50, mAP50-95, precision, recall |

---

## Project Structure

```
pothole-patrol/
├── backend/
│   ├── apps/
│   │   ├── accounts/        # CustomUser, Firebase token auth
│   │   ├── reports/         # CRUD, upvotes, deduplication, rate limiting
│   │   ├── heatmap/         # PostGIS spatial aggregation
│   │   ├── gamification/    # Points, badges, leaderboard
│   │   ├── notifications/   # FCM push + device token management
│   │   └── civic/           # Civic body dispatch + CSV export
│   ├── config/
│   │   └── settings/        # base.py / development.py / production.py
│   ├── utils/
│   │   └── geo.py           # Ward boundary lookup (PostGIS)
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── railway.toml
│   ├── start.sh             # migrate + gunicorn
│   └── worker.sh            # celery worker
│
├── pothole-patrol-mobile/
│   ├── app/                 # Expo Router routes
│   │   ├── (tabs)/          # Map, Report, Leaderboard, Profile
│   │   └── onboarding/      # Auth flow
│   ├── src/
│   │   ├── api/             # axiosClient.ts + endpoint helpers
│   │   ├── components/      # ReportCard, SeverityBadge, MapFilterBar …
│   │   ├── hooks/           # useMLDetection, usePushNotifications
│   │   ├── stores/          # authStore, reportsStore, userStore
│   │   ├── constants/       # severity.ts, api.ts
│   │   └── utils/           # imageHelpers.ts (resize + compress)
│   └── assets/ml/           # pothole_model.tflite
│
└── ml/
    ├── src/
    │   ├── train.py         # YOLOv8-nano fine-tuning (MPS/CUDA/CPU)
    │   ├── evaluate.py      # mAP50 / precision / recall
    │   ├── export.py        # TFLite INT8 export → mobile assets
    │   └── download_dataset.py
    └── pothole_patrol_train.ipynb
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+ and npm
- Docker (optional, for local PostGIS)
- A [Neon](https://neon.tech) project with PostGIS enabled
- Firebase project (Auth + Storage + FCM)

---

### Backend Setup

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
```

**.env** (minimum for local dev):
```env
SECRET_KEY=your-secret-key
DEBUG=True
DJANGO_SETTINGS_MODULE=config.settings.development
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/potholepatrol?sslmode=require
REDIS_URL=redis://localhost:6379/0
FIREBASE_CREDENTIALS_JSON=./firebase-credentials.json
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
ML_CONFIDENCE_THRESHOLD=0.70
ML_MODEL_PATH=./models/best.pt
```

```bash
# Enable PostGIS on your Neon branch (once)
python setup_postgis.py

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# In separate terminals:
celery -A config worker -l info
celery -A config beat -l info
```

Run tests:
```bash
pytest                              # all tests
pytest apps/reports/tests/ -v      # specific app
pytest --cov=apps --cov-report=term # coverage
```

---

### Mobile Setup

```bash
cd pothole-patrol-mobile
npm install

# Copy and fill in environment variables
cp .env.example .env
```

**.env**:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
EXPO_PUBLIC_ML_CONFIDENCE_THRESHOLD=0.5
GOOGLE_WEB_CLIENT_ID=your-web-client-id
```

Place `google-services.json` (from Firebase console) in the `pothole-patrol-mobile/` root.

```bash
npx expo start              # Expo Go dev server
npx expo run:android        # native Android build
npx tsc --noEmit            # TypeScript check
npx eslint src/             # lint
```

> **Note:** On-device TFLite inference requires a native build (`expo run:android` or EAS build). The hook gracefully returns `{ confidence: 0, boundingBox: null }` in Expo Go where the model cannot load.

---

### ML Pipeline Setup

```bash
cd ml
pip install -r requirements.txt

# Download dataset (requires Roboflow API key)
python src/download_dataset.py

# Train (auto-selects MPS on Apple Silicon, CUDA on GPU, CPU otherwise)
python src/train.py

# Evaluate
python src/evaluate.py

# Export best.pt → TFLite INT8 and copy to mobile assets
python src/export.py
```

The export script automatically copies the generated `.tflite` to `pothole-patrol-mobile/assets/ml/pothole_model.tflite`. Bump the version constant in `pothole-patrol-mobile/src/constants/api.ts` after each retrain.

---

## API Reference

Full interactive docs at `/api/docs/swagger/`. Summary of key endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/` | Health check |
| `GET/PATCH` | `/v1/accounts/me/` | User profile |
| `POST` | `/v1/reports/` | Submit a new report |
| `GET` | `/v1/reports/nearby/` | Verified reports within radius |
| `POST` | `/v1/reports/{id}/upvote/` | Upvote (idempotent) |
| `GET` | `/v1/heatmap/` | Spatial heatmap data (bbox / radius + severity filter) |
| `GET` | `/v1/gamification/score/` | Current user's points |
| `GET` | `/v1/gamification/leaderboard/` | Global leaderboard |
| `POST` | `/v1/notifications/devices/` | Register FCM token |
| `GET` | `/v1/civic/bodies/` | List civic bodies |
| `GET` | `/v1/civic/export/` | CSV export (staff only) |

All endpoints require `Authorization: Bearer <Firebase ID token>`.

---

## ML Pipeline

### On-device (mobile)
- Model: YOLOv8-nano exported to TFLite INT8 (~3 MB)
- Runs synchronously before report submission via `useMLDetection`
- Gives instant visual feedback with a bounding box overlay
- Falls back to `{ confidence: 0, boundingBox: null }` if the model file is absent

### Server-side (Celery)
- Same `best.pt` checkpoint loaded via `ultralytics.YOLO`
- Runs asynchronously after the report is saved — never blocks the API response
- Confidence thresholds (configurable via `ML_CONFIDENCE_THRESHOLD` env var):
  - **≥ 0.70** → `verified` → points awarded → civic body dispatch queued
  - **0.50–0.69** → `needs_review` → moderation queue
  - **< 0.50** → `rejected`

### Training
- Base model: YOLOv8-nano pretrained on COCO
- Fine-tuned on RDD2022 road damage dataset + Kaggle pothole images
- Evaluation: mAP50 ≈ 0.78, mAP50-95 ≈ 0.54 (single-pass Kaggle training)

---

## Deployment

The backend is deployed on **Railway** as three services:

| Service | Config | Status |
|---|---|---|
| Web (Gunicorn) | `start.sh` → migrate + gunicorn | Online |
| Celery Worker | `worker.sh` → celery `--concurrency=2` | Online |
| Redis | Managed Railway Redis | Online |

Firebase credentials are passed as a base64-encoded environment variable (`FIREBASE_CREDENTIALS_B64`) to avoid filesystem dependencies in the Railway container.

Docker builds use `python:3.11-slim` with GDAL/GEOS system libraries for PostGIS support. Static files are served by WhiteNoise.

---

## Roadmap

- [ ] Bundle trained TFLite model into EAS production build
- [ ] Offline report queue — store locally with `expo-file-system`, sync on reconnect
- [ ] iOS support — `GoogleService-Info.plist`, EAS iOS profile
- [ ] Noida / Faridabad ward boundary polygons in `CivicBody` data
- [ ] Global API throttling via DRF `DEFAULT_THROTTLE_RATES`
- [ ] Sentry error tracking (backend + mobile)
- [ ] GDA REST webhook integration (email fallback currently active)

---

## Contact

**Maintainer:** Sai Aryan  
**Site:** [saiaryan.in](https://saiaryan.in)  
**Email:** saiaryan.goswami1784@gmail.com
