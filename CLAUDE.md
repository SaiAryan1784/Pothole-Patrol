# CLAUDE.md — Pothole Patrol

## Project Overview

Pothole Patrol is a crowdsourced civic-tech mobile app targeting NCR residents to report, map,
and track road hazards in real time. Users snap GPS-tagged photos of potholes, on-device ML
validates the report, a live heatmap surfaces danger zones, and one-tap submissions go to civic
bodies (GDA, MCD, etc.).

**Monorepo layout:**
```
pothole-patrol/
├── mobile/       ← React Native (Expo) — primary frontend
├── backend/      ← Django REST Framework — primary backend
├── ml/           ← TFLite / YOLOv8 model training + export
└── docs/
```

---

## Mobile (`/mobile`)

### Stack
- **React Native** with **Expo SDK** (latest stable)
- **TypeScript** — strict mode, no `any` types anywhere
- **Expo Router v3** — file-based routing only, never React Navigation manually
- **Zustand** — global state, never Redux
- **NativeWind v4** — all styling via `className`, never `StyleSheet.create()`
- **Axios** — API client with Firebase token interceptor
- **react-native-maps** — Google Maps provider, heatmap + markers
- **@react-native-firebase/auth** — Phone OTP + Google Sign-In (Firebase Auth only, no Firestore/Storage)
- **@react-native-google-signin/google-signin** — Google OAuth token, passed to Firebase Auth
- **@react-native-firebase/storage** — image uploads (Firebase Storage, 5 GB free)
- **@react-native-firebase/messaging** — FCM push notifications
- **expo-notifications** — local notification handling on top of FCM
- **react-native-fast-tflite** — on-device ML inference
- **@gorhom/bottom-sheet** — bottom sheet UI
- **react-native-reanimated + react-native-gesture-handler** — animations

> **Architecture decision (locked):** Firebase is used ONLY for Auth, Storage, and FCM.
> No Firestore, no Firebase Realtime DB. All app data lives in Neon (PostgreSQL) accessed
> via the Django backend. Do not suggest moving any data to Firestore.

### Commands
```bash
cd mobile
npx expo start              # Start dev server
npx expo start --android    # Start on Android emulator
npx expo run:android        # Native build for Android
npx tsc --noEmit            # TypeScript check (run before committing)
npx eslint src/             # Lint
```

### Key Conventions

**Routing:** All routes live in `app/`. Tabs are under `app/(tabs)/`. Auth flow is under
`app/onboarding/`. Never create routes outside the `app/` directory.

**State:** Three Zustand stores only — `authStore`, `reportsStore`, `userStore`. Do not create
additional stores without discussion. Access stores via hooks, not direct imports in components.

**API calls:** All requests go through `src/api/axiosClient.ts`. Never use raw `fetch()`.
Firebase ID token is attached automatically via the request interceptor — do not manually
attach auth headers anywhere else.

**Styling:** NativeWind `className` only. If a style cannot be expressed in Tailwind utility
classes, use `style` prop with an inline object as a last resort and add a `// TODO: move to
NativeWind` comment.

**Images:** Always compress before upload. Use `src/utils/imageHelpers.ts` — resize to 800px
max, quality 0.7. Never upload raw camera output.

**ML:** `src/hooks/useMLDetection.ts` handles all TFLite inference. If `pothole_model.tflite`
is absent from `assets/ml/`, the hook must return `{ confidence: 0, boundingBox: null }`
gracefully — never crash. The stub returns random confidence 0.6–0.95 for development.

**Severity levels:** Always import from `src/constants/severity.ts`. Never hardcode color
strings or point values in components.

**Environment variables:** All env vars prefixed `EXPO_PUBLIC_`. Never hardcode URLs, API keys,
or thresholds. Reference `.env.example` for the full list.

**Firebase config:** `google-services.json` goes in `mobile/` root. Never commit this file.
It is in `.gitignore`.

---

## Backend (`/backend`)

### Stack
- **Python 3.11+**
- **Django 5.x + Django REST Framework**
- **Neon (PostgreSQL + PostGIS)** — managed serverless Postgres, free tier, never pauses
- **dj-database-url** — parse `DATABASE_URL` connection string automatically
- **Celery + Redis** — async task queue for ML verification, notifications, civic dispatch
- **Firebase Admin SDK** — verify Firebase ID tokens server-side (Auth only, no Firestore)
- **Gunicorn + Nginx** — production WSGI setup

> **Architecture decision (locked):** Database is **Neon**, not Supabase and not self-hosted
> Postgres. Neon was chosen over Supabase because: free tier never pauses, unlimited free
> projects (dev/staging/prod all free), and DB branching for safe migrations. Supabase was
> ruled out because Phone OTP requires a paid Twilio integration — Firebase Auth handles
> this free. Do not suggest migrating to Supabase.

### Commands
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver               # Dev server

celery -A config worker -l info          # Start Celery worker
celery -A config beat -l info            # Start Celery beat scheduler

pytest                                   # Run all tests
pytest apps/reports/tests/ -v           # Run specific app tests
pytest --cov=apps --cov-report=term     # Coverage report
```

### Django Apps
| App | Responsibility |
|-----|---------------|
| `accounts` | CustomUser model, Firebase token verification, profile |
| `reports` | Report CRUD, voting, status updates, deduplication |
| `heatmap` | PostGIS spatial aggregation for heatmap endpoint |
| `gamification` | Points, badges, leaderboard |
| `notifications` | FCM push + email dispatch |
| `civic` | Civic body webhook/email integration |

### Key Conventions

**Settings:** Use split settings — `config/settings/base.py`, `development.py`, `production.py`.
Set `DJANGO_SETTINGS_MODULE` in `.env`. Never put secrets in `base.py`.

**Database config:** Always use `dj-database-url` to parse `DATABASE_URL`. Never hardcode
DB credentials. Neon requires `sslmode=require` in the connection string — this is already
included in the `DATABASE_URL` from Neon's dashboard. Config in `settings/base.py`:
```python
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}
```

**Authentication:** All API endpoints require Firebase ID token in `Authorization: Bearer <token>`
header. The `accounts` app verifies this via Firebase Admin SDK. No session auth, no DRF token
auth — Firebase only.

**Geospatial:** Always use PostGIS `GEOGRAPHY` type (not `GEOMETRY`) for the `location` field on
reports. Use `ST_DWithin` for proximity queries. Add spatial index on `location` in migrations.

**Async tasks:** ML verification, FCM notifications, and civic body dispatch must always run as
Celery tasks. Never block the request/response cycle with these operations.

**Rate limiting:** Max 20 report submissions per user per day. Enforced at the Django view level
using a Redis-backed counter. Check `apps/reports/permissions.py`.

**ML confidence thresholds:**
- `>= 0.70` → auto-verify, award points, dispatch to civic body
- `0.50 – 0.69` → status = `needs_review`, goes to moderation queue
- `< 0.50` → status = `rejected`

These values come from `settings.ML_CONFIDENCE_THRESHOLD` — never hardcode in task logic.

**Report deduplication:** On new report submission, check for existing verified reports within
50 metres of the same location. If found, increment upvotes on the existing report instead of
creating a new one.

**API versioning:** All endpoints are under `/v1/`. When breaking changes are needed, create `/v2/`
routes — never modify existing `/v1/` response shapes.

**Tests:** Every new view needs at minimum: unauthenticated request returns 401, valid request
returns expected shape, invalid payload returns 400. Use `pytest-django` fixtures.

---

## ML (`/ml`)

### Stack
- **Python 3.11+**
- **YOLOv8-nano** (server-side, Celery task)
- **TensorFlow Lite** (on-device, exported from training)
- Training datasets: Kaggle pothole datasets + community-verified reports

### Commands
```bash
cd ml
pip install -r requirements.txt
python src/train.py          # Train model
python src/evaluate.py       # Evaluate mAP, precision, recall
python src/export.py         # Export to .tflite + .onnx
```

### Model Files
| File | Location | Used by |
|------|----------|---------|
| `pothole_v1.tflite` | `ml/models/` + `mobile/assets/ml/` | React Native (on-device) |
| `pothole_v1.pt` | `ml/models/` | Django Celery worker (server-side) |

After retraining, copy the new `.tflite` to `mobile/assets/ml/` and bump the version in
`mobile/src/constants/api.ts`.

---

## Environment Variables

### Mobile (`.env` in `/mobile`)
```
EXPO_PUBLIC_API_BASE_URL=https://api.potholepatrol.in/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=

# Firebase — Auth + Storage + FCM only
FIREBASE_PROJECT_ID=
FIREBASE_APP_ID=
FIREBASE_API_KEY=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=

# Google Sign-In
GOOGLE_WEB_CLIENT_ID=              # From Google Cloud Console (OAuth 2.0 Web Client)

# ML
EXPO_PUBLIC_ML_CONFIDENCE_THRESHOLD=0.5
```

### Backend (`.env` in `/backend`)
```
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=
DJANGO_SETTINGS_MODULE=config.settings.development

# Neon PostgreSQL (copy connection string from Neon dashboard — includes sslmode=require)
DATABASE_URL=postgresql://user:pass@ep-xxxx.us-east-2.aws.neon.tech/potholepatrol?sslmode=require

# Firebase Admin SDK — Auth verification only
FIREBASE_CREDENTIALS_JSON=         # Path to service account JSON file

# Firebase Storage
FIREBASE_STORAGE_BUCKET=           # Same bucket as mobile

# Redis (Celery)
REDIS_URL=redis://localhost:6379/0

# Google Maps (server-side geocoding / ward lookup)
GOOGLE_MAPS_API_KEY=

# ML
ML_CONFIDENCE_THRESHOLD=0.70
ML_MODEL_PATH=/models/pothole_v1.pt

# Civic Body
GDA_WEBHOOK_URL=
CIVIC_EMAIL_SENDER=reports@potholepatrol.in
```

---

## Neon Database — Setup Notes

- Create three branches from the Neon dashboard: `main` (prod), `dev`, `staging`
- Each branch has its own `DATABASE_URL` — use the correct one per environment
- PostGIS must be enabled manually: run `CREATE EXTENSION postgis;` once after first connect
- Run `CREATE EXTENSION postgis_topology;` as well for full spatial support
- Neon connection string format: `postgresql://...?sslmode=require` — always `sslmode=require`
- For local dev without Neon, use Docker: `docker run -e POSTGRES_DB=potholepatrol -p 5432:5432 postgis/postgis`

---



### Branch Naming
```
feature/<short-description>     e.g. feature/heatmap-filters
fix/<short-description>         e.g. fix/camera-permission-crash
chore/<short-description>       e.g. chore/update-expo-sdk
```

### Commit Messages
Follow conventional commits:
```
feat(reports): add deduplication within 50m radius
fix(camera): handle permission denial on Android 13
chore(deps): upgrade expo-camera to 14.1.0
test(accounts): add Firebase token expiry test case
```

### Branch Strategy
```
main        ← production only, tagged releases
develop     ← integration branch, PRs merge here first
```

Never push directly to `main`. All changes go through PRs into `develop` first.

---

## Sensitive Files — Never Commit
```
mobile/google-services.json
mobile/GoogleService-Info.plist
backend/.env
backend/firebase-credentials.json    (Firebase service account key)
ml/models/*.pt                        (large binary files, use Git LFS or share manually)
```

> Neon credentials are only ever in `DATABASE_URL` inside `.env` — never hardcoded anywhere.

---

## Civic Body Integration Notes

Current targets: **MCD** (Delhi), **GDA** (Ghaziabad), **NMMC** (Noida).

Dispatch happens via:
1. Formatted email with GPS coordinates, image, severity label, and Google Maps link
2. REST webhook if the civic body exposes an API (future)
3. CSV bulk export endpoint at `/v1/civic/export/` for offline municipal offices

Ward mapping from lat/lng is handled in `backend/utils/geo.py`. Update the ward boundary
GeoJSON file there when adding new cities.

---

## Known Issues & TODOs
- `useMLDetection` is currently stubbed with random confidence — real `.tflite` model pending
- Ward boundary data only covers Delhi + Ghaziabad; Noida/Faridabad to be added
- GDA webhook URL not yet confirmed — email dispatch is the fallback
- iOS build not started; Android only in current phase
- Offline report queue (store locally, sync on reconnect) is Phase 3

---

## Contact
Project: Pothole Patrol
Maintainer: Sai Aryan
Site: saiaryan.in
