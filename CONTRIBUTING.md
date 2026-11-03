# CivicOS — Team Contribution Guidelines

Welcome to the CivicOS engineering team. To maintain production stability, data persistence, and clean service integration across all four modules, every contributor must follow these standards.

---

## 1. Golden Rules of CivicOS Development

1. **Never Commit Secrets:** Never commit `.env` files, database connection strings, JWT keys, or private API tokens. Use `.env.example` templates with sanitized placeholders.
2. **Preserve Existing Records:** Never run destructive database commands (`prisma migrate reset`, `DROP DATABASE`, `TRUNCATE`). All persistent data must be preserved.
3. **No Unapproved Model Swaps:** Do not alter active model weights or swap model keys (e.g. `v1_3class`) without formal team consensus and evaluation.
4. **Use Environment Variables:** Never hardcode `http://localhost:...` or `http://127.0.0.1:...` in production code. Read service URLs from configuration.
5. **Always Verify Builds Before Pushing:** Every pull request must pass:
   - Backend: `npm --prefix backend/backend run build`
   - Frontend: `npm --prefix civicos_person1/civicos run build`
   - Schema: `npx prisma validate --schema=backend/backend/prisma/schema.prisma`

---

## 2. Git Branching & Workflow Convention

### Branch Naming
- Main Release Branch: `main` (Protected; deployable production releases only).
- Active Integration Branch: `develop` (Daily team integration).
- Feature Branches:
  - `feature/person1-frontend-<feature-name>` (e.g. `feature/person1-frontend-map-cluster`)
  - `feature/person2-ai-<feature-name>` (e.g. `feature/person2-ai-yolo-inference`)
  - `feature/person3-predictive-<feature-name>` (e.g. `feature/person3-predictive-cascade-graph`)
  - `feature/person4-backend-<feature-name>` (e.g. `feature/person4-backend-prisma-evidence`)
- Bugfix Branches: `fix/<module>-<short-description>`

### Commit Message Standard
Follow Conventional Commits:
```text
<type>(<module>): <concise present-tense description>

[optional body explaining context and reason for change]

[optional footer referencing issue or task ID]
```

**Types:**
- `feat`: A new feature for citizen, staff, officer, or predictive modules.
- `fix`: A bug fix or workflow repair.
- `refactor`: Code reorganization that neither adds a feature nor fixes a bug.
- `docs`: Documentation updates.
- `chore`: Dependency updates, build configurations, or deployment scripts.

**Examples:**
- `feat(person1): implement persistent drag-and-drop evidence upload`
- `fix(person4): wrap image buffer in uint8array for native formdata fetch`
- `chore(devops): prepare render and vercel deployment manifests`

---

## 3. Module-Specific Development Guidelines

### Person 1 — Frontend (`civicos_person1/civicos`)
- Framework: React 18 + Vite 5 + TypeScript + Tailwind CSS.
- **Rules:**
  - Strictly use `import.meta.env.VITE_*` for non-secret client configuration.
  - Never include private backend service keys or database credentials in frontend code.
  - Test all routes across viewport sizes and simulate network failures gracefully.

### Person 2 — AI Computer Vision (`CivicOS/ai_engine`)
- Framework: FastAPI + PyTorch + YOLO11 + OpenCV.
- **Rules:**
  - Keep active model key as `v1_3class` unless an upgrade is officially approved.
  - Ensure all inference functions support CPU fallback when deployed on cloud VMs without GPUs.
  - Process uploads via transient temporary storage or stream buffers; do not pollute repository directories.

### Person 3 — Predictive Intelligence (`CivicOS_Person3/CivicOS_Person3`)
- Framework: FastAPI + NetworkX + Scikit-Learn + GeoPandas.
- **Rules:**
  - Ensure all model assets (`risk_model.joblib`, `model_metadata.joblib`) load with relative paths via `src/config.py`.
  - Expose standardized `/health` and `/docs` endpoints.
  - Keep Ollama LLM integration optional with deterministic fallbacks when Ollama is offline.

### Person 4 — Express Backend & Integration (`backend/backend`)
- Framework: Express 5 + Prisma ORM + PostgreSQL.
- **Rules:**
  - All database mutations must use Prisma transactions or safe queries.
  - Validate all incoming request payloads with Zod schemas.
  - Log significant state transitions to PostgreSQL `TaskTimeline`.
  - Ensure static file routes and CORS allow cross-origin requests from configured frontends.

---

## 4. Pull Request Checklist

Before submitting a Pull Request into `develop`:
- [ ] Code compiles cleanly with 0 TypeScript/Python syntax errors.
- [ ] No `.env` files or credentials are staged.
- [ ] No binary images or temporary cache directories (`__pycache__`, `node_modules`, `runs/`) are committed.
- [ ] Unit and integration tests pass locally.
- [ ] Documented any newly added environment variables in the appropriate `.env.example` file.
- [ ] Requested review from at least one other team member.
