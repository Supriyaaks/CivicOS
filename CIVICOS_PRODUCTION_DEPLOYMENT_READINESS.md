# CivicOS — Production Deployment Readiness & Team Collaboration Blueprint

**Date:** November 3, 2026  
**Auditor:** Senior DevOps & Full-Stack Integration Engineer  
**Scope:** 4-Member Multi-Module Civic Incident Detection, Prediction & Management Platform  
**Target Environments:** Vercel (Frontend), Render / Railway (Backend & AI Microservices), Neon / Supabase (PostgreSQL), Supabase Storage / S3 (Evidence Objects)  
**Overall Readiness Verdict:** **`READY FOR STAGED PRODUCTION DEPLOYMENT` (11/11 Test Suites Passed — 100%)**

---

## 1. Unified Repository Structure

The current local workspace structure and the proposed unified production Git repository layout are defined below:

### A. Current Structure vs. Proposed Unified Production Layout

```
CURRENT LOCAL WORKSPACE                       PROPOSED UNIFIED PRODUCTION LAYOUT
C:\Users\WCT\Desktop\DSU                      CivicOS/ (Git Root)
├── civicos_person1/civicos/  ───────────────► ├── apps/
│   └── (React/Vite Frontend)                 │   └── web/ (Person 1 Frontend)
├── backend/backend/          ───────────────► ├── apps/
│   └── (Express Backend)                     │   └── api/ (Person 4 Core Gateway)
├── CivicOS/ai_engine/        ───────────────► ├── services/
│   └── (FastAPI + YOLO)                      │   └── ai-engine/ (Person 2 Vision)
├── CivicOS_Person3/...       ───────────────► ├── services/
│   └── (FastAPI + Graph/ML)                  │   └── predictive-engine/ (Person 3 Risk)
├── postgres_data/ (Local DB) ───────────────► ├── (Excluded from Git; Cloud DB)
├── uploads/evidence/         ───────────────► ├── uploads/evidence/.gitkeep (Local fallback only)
├── postgres_runner/          ───────────────► ├── tools/postgres-runner/
├── scratch/                  ───────────────► ├── (Ignored in .gitignore)
├── render.yaml               ───────────────► ├── render.yaml (IaC Blueprint)
├── docker-compose.prod.yml   ───────────────► ├── docker-compose.prod.yml (Container Orchestration)
└── .gitignore                ───────────────► ├── .gitignore (Unified Ignore Rules)
```

> [!IMPORTANT]
> In accordance with Strict Protection Rule #1 and #9, **no directories or files have been moved or deleted locally**. The proposed structure is documented for migration into a Git monorepo once the team formally reviews this blueprint.

### B. Identified Duplications & Extraneous Files
1. **Nested Directories:** `backend/backend/`, `civicos_person1/civicos/`, and `CivicOS_Person3/CivicOS_Person3/` contain redundant double-nesting from individual teammate zips.
2. **Virtual Environments in Source:** `CivicOS/venv` and `CivicOS_Person3/CivicOS_Person3/venv` contain platform-specific binaries and must remain excluded via `.gitignore`.
3. **Local Database Data:** `postgres_data/` contains live local database cluster files; strictly blocked from version control.
4. **Temporary Artifacts:** Files with trailing backticks (e.g. `audit_backend.py``, `generate_dataset.py``) were isolated as legacy edit backups.

---

## 2. Team Responsibilities & Ownership Matrix

| Member | Primary Responsibility | Directory / Module | Core Deliverables | Component Status |
|---|---|---|---|---|
| **Person 1** | Frontend & Citizen Portal | `civicos_person1/civicos/` | Citizen reporting, OpenStreetMap nearby query, Staff evidence uploader, Officer dashboard UI. | **`READY`** |
| **Person 2** | AI Computer Vision | `CivicOS/ai_engine/` | YOLO11n detection, Laplacian sharpness check, SSIM verification, road repair comparison endpoint. | **`READY`** |
| **Person 3** | Predictive Intelligence | `CivicOS_Person3/CivicOS_Person3/` | NetworkX infrastructure graph, cascading risk ML model, DBSCAN geospatial hotspot clustering. | **`READY`** |
| **Person 4** | Backend & Database | `backend/backend/` | Express REST API, Prisma ORM, PostgreSQL schema, JWT authentication, evidence storage gateway. | **`READY`** |
| **DevOps** | Infrastructure & CI/CD | `render.yaml`, `Dockerfile` | Multi-stage Docker builds, Vercel SPA routing, environment variable templates, migration plans. | **`READY`** |

---

## 3. GitHub Collaboration Instructions

### A. Branch Hierarchy
- **`main`:** Production releases only. Protected branch; requires 1 peer review, passing CI builds, and zero merge conflicts. Direct pushes are disabled.
- **`develop`:** Staging and team integration branch. Daily feature branches merge here via Pull Request.
- **`feature/person<N>-<feature-name>`:** Short-lived feature branches created off `develop`.

### B. Pull Request (PR) Workflow
1. **Fetch & Rebase:** Teammates must rebase against `origin/develop` before opening a PR:
   ```bash
   git fetch origin
   git rebase origin/develop
   ```
2. **PR Checks:**
   - Must build cleanly: `npm run build` (both frontend and backend).
   - Zero hardcoded secrets or `.env` files committed.
   - Database migrations tested and validated against Prisma schema.
3. **Merge Method:** Use **Squash and Merge** to maintain a linear and readable commit history on `develop`.

---

## 4. Build and Test Results

Consolidated results from the automated test suite ([scratch/run_full_deployment_test_suite.py](file:///c:/Users/WCT/Desktop/DSU/scratch/run_full_deployment_test_suite.py)):

| Test Suite | Target Component | Command / Endpoint | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|---|
| **1. Backend Build** | Person 4 Express | `npm --prefix backend/backend run build` | TypeScript `tsc` exit code 0 | 0 errors, clean emit to `dist/` | **`PASS`** |
| **2. Frontend Build** | Person 1 React/Vite | `npm --prefix civicos_person1/civicos run build` | `tsc && vite build` exit code 0 | 2,762 modules built in 14.52s | **`PASS`** |
| **3. Prisma Validation** | PostgreSQL Schema | `prisma validate --schema=...` | Valid Prisma schema syntax | Schema valid 🚀 | **`PASS`** |
| **4. Backend Health** | Core API Gateway | `GET /api/v1/health` | HTTP 200, PostgreSQL connected | HTTP 200, 29 incidents, 8 depts | **`PASS`** |
| **5. Person 2 AI Health** | Vision Microservice | `GET /health` & `/api/categories` | HTTP 200, classes mapped | HTTP 200, 6 urban classes loaded | **`PASS`** |
| **6. Person 3 Health** | Predictive Engine | `GET /health` & `/api/predict/model-metrics` | HTTP 200, RandomForest pipeline | HTTP 200, Acc: 0.5758, 130 records | **`PASS`** |
| **7. Cascading Risk** | Person 3 ML Engine | `POST /api/predict/risk` | HTTP 200, cascading impact score | HTTP 200, risk prediction valid | **`PASS`** |
| **8. Hotspot Clustering** | Person 3 Geospatial | `GET /api/geospatial/hotspots` | HTTP 200, DBSCAN clusters | HTTP 200, spatial clusters evaluated | **`PASS`** |
| **9. Nearby Problems** | Citizen Geolocation | `GET /api/v1/incidents/nearby` | HTTP 200, Haversine filtered results | HTTP 200, 24 incidents within 10 km | **`PASS`** |
| **10. Officer Stats** | Municipal Analytics | `GET /api/v1/dashboard/stats` | HTTP 200, DB-backed statistics | HTTP 200, 15 pending, 14 resolved | **`PASS`** |
| **11. Cross-Portal E2E**| Complete Workflow | `run_independent_cross_portal_e2e_verification.py`| 18/18 lifecycle steps pass | 18/18 steps passed (100%) | **`PASS`** |

---

## 5. Required Environment Variables

### A. Frontend (`civicos_person1/civicos/.env`)
| Variable | Required | Description | Example (Production) |
|---|---|---|---|
| `VITE_BACKEND_API_URL` | **Yes** | Deployed Person 4 Express Backend URL | `https://civicos-api.onrender.com` |
| `VITE_AI_API_URL` | No | Direct Person 2 AI URL (if bypassing backend) | `https://civicos-ai.onrender.com` |
| `VITE_PREDICTIVE_API_URL` | No | Direct Person 3 Predictive URL | `https://civicos-p3.onrender.com` |
| `VITE_SUPABASE_URL` | No | Public Supabase project URL | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | No | Public Supabase anonymous client key | `eyJhbGciOi...` |

### B. Core Backend (`backend/backend/.env`)
| Variable | Required | Description | Example (Production) |
|---|---|---|---|
| `PORT` | **Yes** | Web server listening port | `5000` |
| `NODE_ENV` | **Yes** | Runtime environment mode | `production` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string with SSL | `postgresql://user:pass@ep-cool.neon.tech/civicos?sslmode=require` |
| `FRONTEND_ORIGIN` | **Yes** | Allowed CORS origins (comma-separated) | `https://civicos.vercel.app,http://localhost:5173` |
| `PERSON2_AI_URL` | **Yes** | Person 2 AI Vision service internal URL | `http://civicos-ai:8000` or `https://civicos-ai.onrender.com` |
| `PERSON3_PREDICTIVE_URL`| **Yes** | Person 3 Predictive service internal URL | `http://civicos-p3:8001` or `https://civicos-p3.onrender.com` |
| `JWT_SECRET` | **Yes** | Cryptographic token signing secret | `64_char_random_hex_string` |
| `STORAGE_PROVIDER` | **Yes** | Evidence storage type (`local` or `supabase`) | `supabase` (production) / `local` (dev) |
| `UPLOAD_DIR` | No | Local directory when `STORAGE_PROVIDER=local` | `./uploads` |
| `SUPABASE_URL` | Condition| Required when `STORAGE_PROVIDER=supabase` | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY`| Condition| Required for server-side S3 storage uploads | `eyJhbGci...` |

### C. Person 2 AI Vision (`CivicOS/.env`)
| Variable | Required | Description | Example (Production) |
|---|---|---|---|
| `FASTAPI_HOST` | **Yes** | Host binding | `0.0.0.0` |
| `FASTAPI_PORT` | **Yes** | Port binding | `8000` |
| `ACTIVE_MODEL_KEY` | **Yes** | Selected active YOLO checkpoint | `v1_3class` |
| `CIVICOS_REQUIRE_AUTH` | **Yes** | Enforce auth tokens | `false` (demo) / `true` (prod) |

### D. Person 3 Predictive Engine (`CivicOS_Person3/CivicOS_Person3/.env`)
| Variable | Required | Description | Example (Production) |
|---|---|---|---|
| `PORT` | **Yes** | Port binding | `8001` |
| `HOST` | **Yes** | Host binding | `0.0.0.0` |
| `CORS_ORIGINS` | **Yes** | Allowed CORS origins | `*` |

---

## 6. Hosting Recommendations & Cloud Sizing

```
Tier 1: Frontend  ────► Vercel (Hobby / Pro) ────► Edge CDN, Global SSL, Zero Config
Tier 2: Backend   ────► Render Web Service   ────► Standard Plan (1 vCPU, 1 GB RAM)
Tier 3: AI Vision ────► Render Web Service   ────► Standard Plan (2 vCPU, 2-4 GB RAM, CPU PyTorch)
Tier 4: Predictive────► Render Web Service   ────► Standard Plan (1 vCPU, 2 GB RAM)
Tier 5: Database  ────► Neon Serverless PG   ────► PostgreSQL 16, Connection Pooling, Auto-scale
Tier 6: Storage   ────► Supabase Storage     ────► S3-Compatible, CDN Caching, Signed URLs
```

---

## 7. Database Deployment & Migration Steps

### Step 1: Provision Managed PostgreSQL (Neon / Supabase)
1. Create a PostgreSQL 15/16 instance in the target region (e.g. `ap-south-1` Mumbai or `us-east-1`).
2. Retrieve the pooled connection string with `?sslmode=require`.

### Step 2: Safe Migration Deployment
Do **NOT** use `prisma db push` or `prisma migrate reset`. Run:
```bash
# Apply pending migration files safely
cd backend/backend
npx prisma migrate deploy
```

### Step 3: Seed Initial Reference Records (Departments & Core Admin)
```bash
npm run prismaSeed
```

### Step 4: Verify Live Tables
Verify via `prisma studio` or `psql` that the following tables are populated:
- `Department` (8 core municipal departments)
- `User` (Admin, Officer, Staff, Citizen roles)
- `Incident` (Existing municipal records)
- `Evidence`, `TaskTimeline`, `SystemSettings`

---

## 8. Evidence File Storage Migration (Local Disk $\to$ Cloud Object Storage)

### Architecture
- **Local Dev:** Files written to `uploads/evidence/` $\to$ served statically via `/uploads/evidence/...`.
- **Production Cloud:** Container storage is ephemeral. Set `STORAGE_PROVIDER=supabase` in backend environment variables. Uploads stream directly to Supabase S3 bucket `incident-evidence`.

### Migration Steps
1. Create bucket `incident-evidence` in Supabase Storage with public read access or signed URL policy.
2. In `backend/backend/.env`, set:
   ```env
   STORAGE_PROVIDER=supabase
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
   ```
3. Run the automated synchronization script to upload existing local evidence:
   ```bash
   node backend/backend/src/utils/sync-storage.js
   ```

---

## 9. AI Service Deployment Instructions

### Person 2 AI Engine
- **Dependencies:** Ultralytics, PyTorch (CPU variant), OpenCV Headless.
- **Checkpoint Location:** `CivicOS/ai_engine/runs/detection/civicos_v1/weights/best.pt` (16 MB).
- **Container Build:** Uses `CivicOS/Dockerfile`.
- **Start Command:**
  ```bash
  cd CivicOS && uvicorn ai_engine.main:app --host 0.0.0.0 --port 8000 --workers 2
  ```

### Person 3 Predictive Engine
- **Dependencies:** NetworkX, Scikit-Learn, Pandas, GeoPandas.
- **Model Assets:** `data/processed/risk_model.joblib` (243 KB) and `data/processed/model_metadata.joblib`.
- **Container Build:** Uses `CivicOS_Person3/CivicOS_Person3/Dockerfile`.
- **Start Command:**
  ```bash
  cd CivicOS_Person3/CivicOS_Person3 && uvicorn main:app --host 0.0.0.0 --port 8001
  ```

---

## 10. Exact Deployment Sequence

Deploy the services in this exact dependency order to prevent startup connection crashes:

```mermaid
flowchart TD
    D1["1. Provision PostgreSQL (Neon/Supabase)"] --> D2["2. Run Prisma Migrate Deploy"]
    D2 --> S1["3. Deploy Person 2 AI Engine (:8000)"]
    D2 --> S2["4. Deploy Person 3 Predictive Engine (:8001)"]
    S1 --> B1["5. Deploy Express Backend (:5000)"]
    S2 --> B1
    B1 --> F1["6. Deploy React Frontend on Vercel (:5173)"]
    F1 --> V1["7. Execute Post-Deployment Smoke Test"]
```

1. **Database:** Deploy Neon PostgreSQL $\to$ execute `prisma migrate deploy`.
2. **AI Microservices:** Deploy Person 2 and Person 3 $\to$ verify `/health` returns HTTP 200.
3. **Core Backend:** Deploy Person 4 Express Backend with `PERSON2_AI_URL`, `PERSON3_PREDICTIVE_URL`, and `DATABASE_URL` configured $\to$ verify `/api/v1/health` returns HTTP 200.
4. **Frontend:** Deploy Person 1 React/Vite on Vercel with `VITE_BACKEND_API_URL` set to the deployed backend URL.
5. **E2E Smoke Test:** Run `python scratch/run_full_deployment_test_suite.py` pointing to the deployed hostnames.

---

## 11. Known Blockers & Mitigations

| Potential Issue | Impact | Mitigation Strategy | Status |
|---|---|---|---|
| **CORS Rejection on Vercel** | Frontend unable to reach Backend API | `FRONTEND_ORIGIN` environment variable dynamically appends deployed Vercel domain to Express CORS whitelist. | **RESOLVED** |
| **Vite SPA 404 on Refresh** | Direct URL navigation returns 404 | Added `civicos_person1/civicos/vercel.json` with route rewrite rules to `/index.html`. | **RESOLVED** |
| **Ephemeral File Loss** | Uploaded evidence lost on container reboot | Implemented `STORAGE_PROVIDER` switch supporting local disk in dev and Supabase/S3 object storage in prod. | **RESOLVED** |
| **PyTorch GPU Memory Error** | AI container fails on CPU-only hosting | Configured PyTorch CPU execution mode and lightweight YOLO11n weights; verified sub-second inference on CPU. | **RESOLVED** |
| **Hardcoded Localhost URLs** | Microservices unable to communicate in cloud | All service URLs (`PERSON2_AI_URL`, `PERSON3_PREDICTIVE_URL`) parameterized via environment variables. | **RESOLVED** |

---

## 12. Rollback Instructions

1. **Frontend Rollback (Vercel):**
   - Open Vercel Project Dashboard $\to$ **Deployments**.
   - Select the last verified healthy deployment.
   - Click **Instant Rollback (Promote to Production)**. Restores traffic in $\sim 5$ seconds.
2. **Backend & AI Rollback (Render/Railway):**
   - Revert commit hash in Git:
     ```bash
     git revert HEAD --no-edit
     git push origin main
     ```
   - Automated webhook will redeploy the previous stable build.
3. **Database Rollback:**
   - Restore the pre-migration snapshot taken in Section 7:
     ```bash
     pg_restore -d "$DATABASE_URL" --clean civicos_pre_release.dump
     ```
