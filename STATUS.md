# Pothole Patrol — Project Status

Last updated: 2026-04-09

---

## Overall Progress: ~80% complete

| Layer | Done | Remaining |
|-------|------|-----------|
| Backend | 95% | Server-side ML inference in Celery task |
| Mobile | 85% | TFLite wired but no trained model bundled yet; TypeScript check not run |
| ML | 70% | Model trained + committed; TFLite export pending; Celery task not updated |
| Infrastructure | 90% | Celery worker build failing on Railway |

---

## What Is Done

### Infrastructure
- [x] Monorepo — `backend/`, `pothole-patrol-mobile/`, `ml/` under single git repo
- [x] Backend deployed on Railway at `pothole-patrol-production.up.railway.app`
- [x] Neon PostgreSQL + PostGIS connected, migrations applied
- [x] Redis service on Railway (Celery broker)
- [x] Celery worker service running on Railway (all 4 tasks discovered + ready)
- [x] `GET /health/` returns 200 — Railway health checks passing
- [x] `SECURE_SSL_REDIRECT=False` + `SECURE_PROXY_SSL_HEADER` configured correctly
- [x] `FIREBASE_CREDENTIALS_B64` pattern for Railway (no filesystem dependency)
- [x] Root `.gitignore` covering all three workspaces

### Backend (`backend/`)
- [x] Django 5 + DRF + split settings (base / development / production)
- [x] `CustomUser` model with Firebase UID as primary identifier
- [x] `FirebaseAuthentication` middleware — all endpoints require Bearer token
- [x] `POST /v1/reports/` — create report, 50m deduplication, rate limit (20/day)
- [x] `GET /v1/reports/nearby/` — verified reports within radius via `ST_DWithin`
- [x] `POST /v1/reports/{id}/upvote/` — idempotent via `Upvote` model (`unique_together`)
- [x] `GET /v1/heatmap/` — bbox + lat/lng/radius + severity filtering
- [x] `GET /v1/gamification/score/` + `GET /v1/gamification/leaderboard/`
- [x] `GET/PATCH /v1/accounts/me/` — profile read + display name update
- [x] `POST /v1/notifications/devices/` — FCM token registration
- [x] `GET /v1/civic/bodies/` + `GET /v1/civic/export/` (staff-only CSV)
- [x] `process_report_ml` Celery task — routes by confidence threshold
- [x] `award_points_for_report` — 10pts per verified report, badge unlock
- [x] `send_push_notification` — FCM dispatch with stale token cleanup
- [x] `dispatch_report_to_civic_body` — email + webhook routing
- [x] CORS configured (`corsheaders`), WhiteNoise static files
- [x] Swagger UI at `/api/docs/swagger/`
- [x] `pytest` suite — accounts, reports, gamification tests written
- [x] `conftest.py` with `auth_client`, `verified_report` fixtures
- [x] `Dockerfile` — `python:3.11-slim` + GDAL/GEOS system libs + collectstatic at build
- [x] `start.sh` — migrate + gunicorn
- [x] `worker.sh` — celery worker with `--concurrency=2`
- [x] `railway.toml` — no healthcheckPath (prevents worker health check failures)

### Mobile (`pothole-patrol-mobile/`)
- [x] Expo SDK + TypeScript strict mode + Expo Router v3 + NativeWind v4
- [x] `authStore` — Firebase Phone OTP + Google Sign-In
- [x] `reportsStore` — fetchHeatmapData, fetchNearbyReports
- [x] `userStore` — fetchProfile, fetchScore, fetchBadges
- [x] Map screen — heatmap overlay + report markers + filter bar + bottom sheet on marker tap
- [x] Report form — camera, image compression, severity selector, ML confidence, POST to API
- [x] Leaderboard screen — FlatList, rank medals, pull-to-refresh
- [x] Profile screen — avatar, editable display name, points, badge grid, sign out
- [x] `UpvoteButton` — optimistic update, API call, revert on failure
- [x] `useMLDetection` — real TFLite inference code (falls back to `confidence: 0` if no model)
- [x] `usePushNotifications` — FCM token registration at `/notifications/devices/`
- [x] Background FCM handler — `scheduleNotificationAsync` (not just logging)
- [x] `SeverityBadge`, `ReportCard`, `ReportMarker`, `MapFilterBar` components complete
- [x] Severity enum aligned: `LOW / MEDIUM / HIGH / CRITICAL` (matches backend)
- [x] `EXPO_PUBLIC_API_BASE_URL` pointing to Railway production URL

### ML (`ml/`)
- [x] `train.py` — real YOLOv8-nano training with ultralytics, MPS/CUDA/CPU auto-detect
- [x] `evaluate.py` — mAP50, mAP50-95, precision, recall
- [x] `export.py` — TFLite INT8 export + auto-copy to `pothole-patrol-mobile/assets/ml/`
- [x] `download_dataset.py` — Roboflow dataset downloader
- [x] `pothole_patrol_train.ipynb` — Kaggle notebook (RDD2022 + YOLOv8 dataset, single-pass training)
- [x] `best.pt` (YOLOv8-nano, ~6 MB) committed to `backend/models/best.pt`
- [x] `ML_MODEL_PATH=/app/models/best.pt` set on Railway web + worker services

---

## What Is NOT Done

### Immediate (blocking production readiness)

- [ ] **Celery worker build failing on Railway** — triggered by `best.pt` commit redeploy; check worker build logs for error
- [ ] **`ultralytics` not in `backend/requirements.txt`** — needed for server-side YOLOv8 inference in `process_report_ml` task
- [ ] **`process_report_ml` Celery task still reads client-sent confidence** — needs to download image from Firebase Storage URL and run `YOLO(ML_MODEL_PATH)(image)` server-side
- [ ] **`pothole_model.tflite` not in `pothole-patrol-mobile/assets/ml/`** — need to run `python ml/src/export.py` after Kaggle training finishes, or export from `best.pt` locally
- [ ] **TypeScript check not run** — `npx tsc --noEmit` in `pothole-patrol-mobile/` (may have errors)
- [ ] **Backend tests not run against production DB** — `venv/bin/python3.11 -m pytest -v` in `backend/`

### Near-term
- [ ] **Database migrations for `Upvote` model + `CivicBody` spatial index** — `makemigrations` + `migrate` needed in production
- [ ] **Ward boundary data** — `CivicBody.region_boundary` polygons not loaded; civic dispatch falls back to email-only with no jurisdiction routing
- [ ] **`GOOGLE_MAPS_API_KEY`** not set on Railway — `get_ward_for_location()` in `utils/geo.py` will return `None` for all lookups
- [ ] **SMTP env vars** not set on Railway — civic email dispatch will fail silently
- [ ] **`CORS_ALLOWED_ORIGINS`** on Railway — confirm it includes the mobile app's origin

### Phase 3 (future)
- [ ] Real TFLite model bundled in mobile app — requires EAS build (Expo Go won't load `.tflite`)
- [ ] Offline report queue — `expo-file-system` + `@react-native-community/netinfo`
- [ ] iOS support — `GoogleService-Info.plist`, EAS iOS profile, iOS permissions
- [ ] Sentry error tracking — `sentry-sdk[django,celery]` backend + Expo Sentry mobile
- [ ] Global API throttling — `DEFAULT_THROTTLE_RATES` in `REST_FRAMEWORK` settings
- [ ] Leaderboard user rank from backend — `?include_me=true` param
- [ ] Noida / Faridabad ward boundaries in `CivicBody` data

---

## Next Actions (in order)

1. Fix Celery worker Railway build — check build logs for the failure
2. Add `ultralytics>=8.4.0` to `backend/requirements.txt`
3. Update `process_report_ml` to run server-side YOLOv8 inference on the image URL
4. Export `best.pt` → `pothole_model.tflite` locally and copy to mobile assets
5. Run `npx tsc --noEmit` in mobile — fix any TypeScript errors
6. Run `venv/bin/python3.11 -m pytest -v` in backend — confirm all tests pass
7. Trigger an EAS build to bundle the TFLite model for real on-device inference

---

## Railway Services

| Service | Status | URL |
|---------|--------|-----|
| Web (Gunicorn) | Online | `pothole-patrol-production.up.railway.app` |
| Celery Worker | Build failing | — |
| Redis | Online | `redis.railway.internal:6379` |

## Key Env Vars Set on Railway

| Var | Web | Worker |
|-----|-----|--------|
| `DJANGO_SETTINGS_MODULE` | ✅ | ✅ |
| `SECRET_KEY` | ✅ | ✅ |
| `DATABASE_URL` | ✅ | ✅ |
| `REDIS_URL` | ✅ | ✅ |
| `FIREBASE_CREDENTIALS_B64` | ✅ | ✅ |
| `FIREBASE_STORAGE_BUCKET` | ✅ | ✅ |
| `ML_MODEL_PATH` | ✅ | ✅ |
| `ALLOWED_HOSTS` | ✅ | ✅ |
| `GOOGLE_MAPS_API_KEY` | ❌ | ❌ |
| `CORS_ALLOWED_ORIGINS` | ❓ | — |
| `EMAIL_HOST` / `EMAIL_HOST_USER` | ❌ | ❌ |
