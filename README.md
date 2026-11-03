# CivicOS — AI-Powered Smart City Civic Incident Detection, Prediction & Management Platform

CivicOS is an end-to-end municipal platform that connects citizens, field maintenance crews, and municipal department officers into a unified closed-loop civic incident lifecycle:

$$\text{Observe} \longrightarrow \text{Understand} \longrightarrow \text{Predict} \longrightarrow \text{Prevent} \longrightarrow \text{Coordinate} \longrightarrow \text{Resolve} \longrightarrow \text{Learn}$$

---

## 1. System Architecture & Team Modules

The platform is developed by a four-member engineering team with cleanly separated service boundaries:

```
                                    ┌────────────────────────────────┐
                                    │    Person 1: Citizen & Staff   │
                                    │        Portal (React/Vite)     │
                                    │            Port 5173           │
                                    └───────────────┬────────────────┘
                                                    │
                                           HTTP / REST / Uploads
                                                    │
                                    ┌───────────────▼────────────────┐
                                    │   Person 4: Express Gateway    │
                                    │   & Persistence (Node/Prisma)  │
                                    │            Port 5000           │
                                    └───────┬───────────────┬────────┘
                                            │               │
                 ┌──────────────────────────┴────┐     ┌────┴──────────────────────────┐
                 │                               │     │                               │
┌────────────────▼───────────────┐               │     │ ┌─────────────────────────────▼─┐
│     Person 2: AI Engine        │               │     │ │  Person 3: Predictive Engine  │
│  YOLO Vision & Repair Verif.   │               │     │ │   Graph Cascading & Hotspots  │
│       FastAPI (Port 8000)      │               │     │ │       FastAPI (Port 8001)     │
└────────────────────────────────┘               │     │ └───────────────────────────────┘
                                    ┌────────────▼─────▼─────────────┐
                                    │      PostgreSQL 18.6 DB        │
                                    │    Authoritative Persistence   │
                                    │            Port 5432           │
                                    └────────────────────────────────┘
```

| Member | Module | Directory | Technology Stack | Port |
|---|---|---|---|---:|
| **Person 1** | Frontend & Citizen Portal | `civicos_person1/civicos/` | React 18, Vite 5, Tailwind CSS, Leaflet, Recharts, Zustand | `5173` |
| **Person 2** | AI Computer Vision Engine | `CivicOS/ai_engine/` | FastAPI, YOLO11, PyTorch, OpenCV, Laplacian Blur, SSIM | `8000` |
| **Person 3** | Predictive Intelligence | `CivicOS_Person3/CivicOS_Person3/` | FastAPI, NetworkX Graph, Scikit-Learn, GeoPandas, DBSCAN | `8001` |
| **Person 4** | Core Backend & Integration | `backend/backend/` | Node.js Express 5, Prisma ORM, PostgreSQL, Helmet, Zod | `5000` |
| **Database** | Municipal Relational Store | `postgres_data/` | PostgreSQL 18.6 | `5432` |

---

## 2. Key Platform Capabilities

1. **Citizen Engagement (`/citizen`):**
   - Geolocation-based incident reporting with photograph uploads.
   - Interactive OpenStreetMap view of nearby civic problems with distance filters.
   - Live status tracking and public resolution verification certificates.

2. **Field Staff Operations (`/staff`):**
   - Task assignment queue with real-time status transitions.
   - Persistent drag-and-drop before/after evidence photograph uploader.
   - Operational safety and compaction checklists stored in PostgreSQL.
   - Dynamic repair verification readiness evaluation.

3. **Municipal Officer Center (`/officer`):**
   - Multi-department coordination, workload balancing, and SLA tracking.
   - AI-assisted road repair verification drawer with before/after comparison and SSIM analysis.
   - Interactive decision workflows: one-click approval or detailed rework feedback.
   - Geospatial hotspot clusters and cascading infrastructure failure predictions.

---

## 3. Local Development Setup

### Prerequisites
- **Node.js:** v18.x or v20.x+
- **Python:** v3.10 or v3.11+
- **PostgreSQL:** v15+ (or embedded runner)

### Step 1: Clone and Configure Environment
```bash
git clone <repository-url>
cd CivicOS

# Configure Backend environment
cp backend/backend/.env.example backend/backend/.env

# Configure Frontend environment
cp civicos_person1/civicos/.env.example civicos_person1/civicos/.env

# Configure AI Engine environment
cp CivicOS/.env.example CivicOS/.env

# Configure Predictive Engine environment
cp CivicOS_Person3/CivicOS_Person3/.env.example CivicOS_Person3/CivicOS_Person3/.env
```

### Step 2: Install Dependencies
```bash
# 1. Person 4 Backend
cd backend/backend && npm install && npx prisma generate && cd ../..

# 2. Person 1 Frontend
cd civicos_person1/civicos && npm install && cd ../..

# 3. Person 2 AI Engine
pip install -r CivicOS/ai_engine/requirements.txt

# 4. Person 3 Predictive Engine
pip install -r CivicOS_Person3/CivicOS_Person3/requirements.txt
```

### Step 3: Run the Services
Run each service in separate terminal sessions:

```bash
# Terminal 1: PostgreSQL Database (Port 5432)
node postgres_runner/server.js

# Terminal 2: Person 4 Express Backend (Port 5000)
cd backend/backend && npm run build && npm start

# Terminal 3: Person 2 AI Engine (Port 8000)
cd CivicOS && uvicorn ai_engine.main:app --host 127.0.0.1 --port 8000

# Terminal 4: Person 3 Predictive Engine (Port 8001)
cd CivicOS_Person3/CivicOS_Person3 && uvicorn main:app --host 127.0.0.1 --port 8001

# Terminal 5: Person 1 React Frontend (Port 5173)
cd civicos_person1/civicos && npm run dev
```

---

## 4. Testing & Verification

CivicOS includes automated end-to-end integration test suites:

```bash
# Run backend TypeScript build verification
npm --prefix backend/backend run build

# Run frontend production build verification
npm --prefix civicos_person1/civicos run build

# Run cross-portal 18-step automated lifecycle test
python scratch/run_independent_cross_portal_e2e_verification.py
```

---

## 5. Team Documentation
- [CONTRIBUTING.md](file:///c:/Users/WCT/Desktop/DSU/CONTRIBUTING.md) — Coding standards, git conventions, and PR guidelines.
- [TEAM_WORKFLOW.md](file:///c:/Users/WCT/Desktop/DSU/TEAM_WORKFLOW.md) — 4-member branching strategy, conflict resolution, and review workflow.
- [DEPLOYMENT_ARCHITECTURE.md](file:///c:/Users/WCT/Desktop/DSU/docs/DEPLOYMENT_ARCHITECTURE.md) — Production containerization, hosting blueprints, and migration procedures.
- [CIVICOS_FINAL_CROSS_PORTAL_E2E_VERIFICATION_REPORT.md](file:///c:/Users/WCT/Desktop/DSU/CIVICOS_FINAL_CROSS_PORTAL_E2E_VERIFICATION_REPORT.md) — Full end-to-end audit report.
