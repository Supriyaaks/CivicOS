# CivicOS — Production Deployment Architecture & DevOps Blueprint

This document defines the production hosting topology, containerization strategy, database persistence, persistent object storage, and deployment procedures for the CivicOS platform.

---

## 1. Production Hosting Topology

```
                       ┌────────────────────────────────────────────────────────┐
                       │                   Cloudflare DNS / SSL                 │
                       │                    civicos.smartcity.org               │
                       └───────────┬────────────────────────────────┬───────────┘
                                   │                                │
                       HTTPS       │                    HTTPS       │
                      (Frontend)   │                   (API Routes) │
                                   ▼                                ▼
                    ┌──────────────────────────────┐ ┌──────────────────────────────┐
                    │      Vercel / Netlify        │ │        Render / Railway      │
                    │   React 18 + Vite Frontend   │ │    Node.js Express Backend   │
                    │   Static Edge CDN Hosting    │ │      Container / Web Service │
                    │   (civicos-web.vercel.app)   │ │      (civicos-api.render.com)│
                    └──────────────────────────────┘ └──────────────┬───────────────┘
                                                                    │
                                            Internal Virtual Private Network (VPN)
                                                                    │
                             ┌──────────────────────────────────────┴──────────────────────────────────────┐
                             │                                                                             │
                             ▼                                                                             ▼
              ┌──────────────────────────────┐                                              ┌──────────────────────────────┐
              │    Person 2 AI Engine        │                                              │ Person 3 Predictive Engine   │
              │  FastAPI + YOLO + PyTorch    │                                              │ FastAPI + NetworkX + Scikit  │
              │   Render Background Worker   │                                              │   Render Background Worker   │
              │   (civicos-ai.render.com)    │                                              │   (civicos-p3.render.com)    │
              └──────────────────────────────┘                                              └──────────────────────────────┘
                                             \                                              /
                                              \                                            /
                                               ▼                                          ▼
                                ┌────────────────────────────────────────────────────────┐
                                │             Managed PostgreSQL Database                │
                                │           (Neon / Supabase / AWS RDS PG 16)            │
                                │           Pooled Connection with SSL Required          │
                                └────────────────────────────────────────────────────────┘
                                                             ▲
                                                             │
                                ┌────────────────────────────┴───────────────────────────┐
                                │          Persistent S3 / Supabase Object Storage       │
                                │          Before/After Repair Evidence Photographs      │
                                └────────────────────────────────────────────────────────┘
```

---

## 2. Service Specifications & Hosting Recommendation

| Tier | Service | Recommended Provider | Sizing / Specs | Environment Variables |
|---|---|---|---|---|
| **Tier 1: Web** | React/Vite Frontend | **Vercel** | Edge Network, Automated CI/CD from `main` | `VITE_BACKEND_API_URL` |
| **Tier 2: API** | Express Backend | **Render / Railway** | 1 vCPU, 1 GB RAM (Node 20 runtime) | `PORT`, `DATABASE_URL`, `FRONTEND_ORIGIN`, `PERSON2_AI_URL`, `PERSON3_PREDICTIVE_URL`, `JWT_SECRET` |
| **Tier 3: AI Vision** | Person 2 YOLO Engine | **Render / AWS ECS** | 1-2 vCPU, 2-4 GB RAM (Python 3.11 CPU) | `FASTAPI_PORT`, `ACTIVE_MODEL_KEY=v1_3class`, `MODEL_PATH` |
| **Tier 4: Predictive** | Person 3 Risk Engine | **Render / AWS ECS** | 1 vCPU, 1-2 GB RAM (Python 3.11) | `PORT=8001`, `CORS_ORIGINS=*` |
| **Tier 5: Database** | Relational Store | **Neon / Supabase** | Managed PostgreSQL 15/16, Connection Pooling | `DATABASE_URL` with `sslmode=require` |
| **Tier 6: Storage** | Evidence Photos | **Supabase Storage / AWS S3** | S3-Compatible Object Store | `STORAGE_PROVIDER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## 3. Production Database Migration Protocol

When deploying database changes to production:

1. **Never Run `prisma db push` or `prisma migrate reset` in Production:**
   `db push` can cause silent data loss if schemas diverge. `migrate reset` destroys all municipal records.
2. **Execute Safe Migration Deploy:**
   ```bash
   npx prisma migrate deploy --schema=backend/backend/prisma/schema.prisma
   ```
   `prisma migrate deploy` applies only pending migration files recorded in `prisma/migrations/` without resetting existing tables.
3. **Database Backup Prior to Release:**
   Before applying any migration on production, trigger an automated snapshot:
   ```bash
   # Neon CLI snapshot
   neon branch create --from main backup-before-release-$(date +%Y%m%d)
   
   # Or standard pg_dump
   pg_dump "$DATABASE_URL" -F c -b -v -f "civicos_backup_$(date +%Y%m%d).dump"
   ```

---

## 4. Evidence File Storage Migration (Local Disk $\to$ Cloud S3)

In local development, uploads are written to disk under `uploads/evidence/` and served via static route `/uploads/evidence/...`.

In production containerized environments (Render, Fly.io, Railway), container filesystems are **ephemeral** and destroyed upon redeployment. Therefore:

1. **Activate Cloud Storage Mode:**
   Set `STORAGE_PROVIDER=supabase` (or `s3`) in the backend environment variables.
2. **Bucket Initialization:**
   Create a private bucket named `incident-evidence` with row-level security or signed URL access.
3. **Local-to-Cloud Asset Sync Script:**
   To migrate existing local evidence to the cloud bucket:
   ```bash
   node scripts/sync_local_evidence_to_s3.js
   ```
   This script reads all local files in `uploads/evidence/`, uploads them to the cloud bucket, and updates the `Evidence.url` column in PostgreSQL from `/uploads/evidence/...` to the permanent cloud CDN URL.

---

## 5. Security & Network Hardening

1. **Content Security Policy & CORS:**
   Express backend configures Helmet with `crossOriginResourcePolicy: { policy: 'cross-origin' }` and restricts CORS specifically to the registered frontend domain (`process.env.FRONTEND_ORIGIN`).
2. **Secret Separation:**
   - Frontend repository contains zero backend secrets.
   - Backend repository contains zero database credentials in code.
   - All production secrets are injected through the hosting platform's encrypted environment variable dashboard.
3. **Health Check Probes:**
   - Frontend: `GET /` (HTTP 200)
   - Backend: `GET /api/v1/health` (HTTP 200, checks DB connection & table counts)
   - Person 2 AI: `GET /health` (HTTP 200)
   - Person 3 Predictive: `GET /health` (HTTP 200)

---

## 6. Rollback Procedures

If an issue occurs during a production deployment:

1. **Frontend Instant Rollback (Vercel):**
   In the Vercel Dashboard, select **Deployments**, locate the last known healthy deployment, and click **Promote to Production** (takes $\sim 5$ seconds).
2. **Backend Rollback (Render/Railway):**
   Roll back the Git commit hash to the previous release tag:
   ```bash
   git revert HEAD -m 1
   git push origin main
   ```
3. **Database Rollback:**
   If a migration needs to be reversed:
   - Restore from the pre-deployment snapshot:
     ```bash
     pg_restore -d "$DATABASE_URL" --clean civicos_backup_YYYYMMDD.dump
     ```
