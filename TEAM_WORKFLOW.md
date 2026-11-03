# CivicOS — Team Collaboration & Git Integration Protocol

This document governs daily collaboration, code reviews, integration testing, and deployment preparation for the four CivicOS team members:
- **Person 1:** Citizen & Staff Frontend (`civicos_person1/civicos`)
- **Person 2:** AI Computer Vision Engine (`CivicOS/ai_engine`)
- **Person 3:** Predictive Intelligence Engine (`CivicOS_Person3/CivicOS_Person3`)
- **Person 4:** Express Backend & System Integration (`backend/backend`)

---

## 1. Branch Strategy

```
main (Production Releases - Protected)
  ▲
  │ (Release PR after comprehensive staging test)
  │
develop (Team Integration Branch - Active)
  ▲
  ├── feature/person1-frontend-<name>      (Person 1)
  ├── feature/person2-ai-<name>            (Person 2)
  ├── feature/person3-predictive-<name>    (Person 3)
  └── feature/person4-backend-<name>       (Person 4)
```

### Branch Responsibilities
1. **`main`:** Contains battle-tested, production-ready code. Direct commits and force-pushes are strictly blocked. Deployments to production environments (Vercel, Render, Railway) trigger from `main`.
2. **`develop`:** The central integration branch. All teammate feature branches merge here via Pull Request after passing local tests.
3. **`feature/personX-...`:** Work in progress by individual team members. Created from `develop` and kept up-to-date with frequent rebasing.

---

## 2. Daily Teammate Workflow

### Step 1: Starting a New Task
Always pull the latest changes from `develop` before branching:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/person1-frontend-task-cards
```

### Step 2: Developing & Committing Locally
Make focused, modular commits that touch only your assigned module:
```bash
# Verify modified files
git status

# Stage only relevant changes (NEVER stage .env or node_modules)
git add civicos_person1/civicos/src/components/TaskCard.tsx

# Commit using conventional commits
git commit -m "feat(person1): implement dynamic task card priority badges"
```

### Step 3: Keeping in Sync with `develop`
Before opening a pull request, rebase your feature branch on `develop` to resolve drift early:
```bash
git fetch origin
git rebase origin/develop
```

### Step 4: Pushing & Creating a Pull Request
Push your feature branch to the remote repository:
```bash
git push -u origin feature/person1-frontend-task-cards
```
Open a Pull Request on GitHub targeting `develop`:
- Title: `feat(person1): dynamic task card priority badges`
- Description: Summary of changes, affected routes, and testing steps performed.
- Assignee: Author.
- Reviewer: At least one teammate (e.g. Person 4 for backend contracts, Person 2/3 for AI contracts).

---

## 3. Pull Request Review & Approval Guidelines

### Reviewer Checklist:
1. **Scope:** Does the PR touch only files within the author's module boundary or approved shared contracts?
2. **Secrets:** Are there any hardcoded API keys, passwords, database strings, or `.env` files? (If yes, immediate rejection).
3. **Contracts:** If backend endpoints or schemas were altered, did Person 4 approve the change and update the Prisma schema?
4. **Builds:** Do both frontend and backend build commands exit with code 0?
5. **Database:** Does the PR avoid destructive migration commands?

### Approving and Merging:
- Use **Squash and Merge** or **Rebase and Merge** to keep the `develop` history linear and clean.
- Delete the feature branch on GitHub after merging.

---

## 4. Resolving Merge Conflicts Safely

If GitHub reports merge conflicts between your branch and `develop`:

1. **Rebase Locally:** Never click "Resolve conflicts" with blind web edits. Always resolve locally:
   ```bash
   git checkout feature/your-branch
   git fetch origin
   git rebase origin/develop
   ```
2. **Inspect Conflicted Files:**
   Git will pause at the conflict:
   ```bash
   git status
   ```
3. **Resolve Conflicts:** Open the conflicted file in your editor. Choose the correct combined logic, save the file, and stage it:
   ```bash
   git add <resolved-file-path>
   ```
4. **Continue Rebase:**
   ```bash
   git rebase --continue
   ```
5. **Verify Builds:** Run frontend and backend build checks before pushing:
   ```bash
   npm --prefix backend/backend run build
   npm --prefix civicos_person1/civicos run build
   ```
6. **Force-Push Safely to Your Feature Branch:**
   ```bash
   git push --force-with-lease origin feature/your-branch
   ```

---

## 5. Post-Integration Verification Protocol

Whenever a feature merges into `develop`, run the full integration suite to ensure no cross-service regression occurred:

```bash
# 1. Health checks on all microservices
python scratch/check_services.py

# 2. Complete 18-step cross-portal end-to-end lifecycle verification
python scratch/run_independent_cross_portal_e2e_verification.py

# 3. Regression test on core features (Nearby Problems, Dashboard Stats, AI, Predictive)
python scratch/check_regression.py
```

If all 18 tests pass, the `develop` branch is considered stable and eligible for staging release tagging.
