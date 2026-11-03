# CIVICOS_FRONTEND_BLUEPRINT.md

## 1. Overall Architecture
CivicOS is a **Multi-Tenant Progressive Web Application (PWA)** built on a **Role-Based Access Control (RBAC)** framework. The system is designed to bridge the gap between citizen reporting and municipal intelligence using a "Sense $\rightarrow$ Analyze $\rightarrow$ Act $\rightarrow$ Verify" lifecycle.

### Multi-Tenancy Decision
**Definition**: Multi-tenancy is an architectural pattern where a single instance of the software serves multiple separate organizations (tenants), such as different municipalities or city districts, while keeping their data strictly isolated.

**Evaluation**:
- **Single Municipality (Expandable)**: Simpler deployment, shared global settings, but requires careful filtering to prevent data leakage if expanded.
- **Multiple Municipalities (Strict Separation)**: Higher complexity in database partitioning (Schema-per-tenant or Tenant-ID columns), but provides maximum security and regulatory compliance for different jurisdictions.

**V1 Recommendation**: **Single Municipality (Expandable)**. 
To avoid unnecessary infrastructure complexity during the initial launch, V1 will focus on a single municipal entity but implement a `tenant_id` column across all core tables. This ensures the system is "Multi-tenant Ready" and can be scaled to multiple municipalities without a full database redesign.

### Tech Stack & Candidates
- **Framework**: React 18+ with TypeScript (Type-safety for complex AI/Geospatial data).
- **State Management**: 
    - **Zustand**: (Optional) Will only be introduced if the actual frontend requires centralized state management for complex UI state (e.g., sidebar toggles, map filters) that exceeds React Context capabilities.
    - **React Query**: Used for all server-state caching and synchronization with Supabase.
- **Geospatial Engine**: **Mapbox GL JS** or **Leaflet** (Candidates).
    - *Evaluation*: The final decision will be made during the relevant implementation step based on functionality, 3D requirements for the Digital Twin, and cost analysis.
- **Backend**: **Supabase** (Auth, PostgreSQL, PostGIS, Storage, Real-time).
- **Styling**: Tailwind CSS (Atomic design, Dark Mode default for operational portals).

---

## 2. Complete Page Hierarchy

### A. Citizen Portal (11 Pages)
*Goal: Maximum accessibility and trust through transparency.*
1. **Homepage**: City status overview, quick-action reporting, and AI-driven search.
2. **Login**: Secure RBAC entry.
3. **Registration**: Minimal profile creation (No unnecessary identity docs).
4. **Citizen Dashboard**: Summary of my reports, nearby active issues, and personalized city alerts.
5. **Report a Problem**: The Multimodal Reporting center (Text/Voice/Image).
6. **My Complaints**: List view of all submitted reports with status filters.
7. **Complaint Details & Tracking**: Vertical timeline of a specific incident's lifecycle.
8. **Nearby Civic Problems**: Map-centric view of local issues to prevent duplicate reporting.
9. **Notifications**: Alerts on report progress, city emergencies, or resolution requests.
10. **Resolution Confirmation**: Interface to verify if a reported problem was actually fixed.
11. **Personal Profile**: User settings and resident verification status.

### B. Municipal Officer Portal (23 Sections organized into Hubs)
*Goal: Strategic oversight and predictive intelligence.*

**Hub 1: Command Hub (The "War Room")**
1. **Officer Dashboard**: High-level KPI tiles (Avg. resolution time, active criticals, city health).
2. **Live City Digital Twin**: The primary geospatial interface for real-time monitoring.
3. **Emergency Center**: High-priority alert center for immediate crisis management.

**Hub 2: Intelligence Hub (The "Prediction Engine")**
4. **Incident Clustering**: Grouping related reports into a single "Event" via AI.
5. **Predictive Intelligence Hub**: Forecasting likely failures based on historical patterns.
6. **Root-Cause Analysis**: AI-driven deep dive into *why* a cluster of issues is occurring.
7. **Impact & Severity Assessment**: Quantitative scoring of incidents on city infrastructure.
8. **Cascading Risk Prediction**: Modeling how one failure affects others.
9. **Weather & Environmental Intelligence**: Integration of real-time weather layers.

**Hub 3: Operations Hub (The "Orchestrator")**
10. **Incident Management**: Master list of all city incidents with filtering/sorting.
11. **Incident Details & AI Analysis**: Combined view of report data + AI-suggested actions.
12. **Department Assignment**: Reviewing AI-suggested departments and finalizing assignments.
13. **Cross-Department Coordination**: Managing joint-task forces for complex issues.
14. **Resource Optimization**: High-level allocation of crews and equipment.
15. **What-If Simulation**: Testing scenarios (e.g., "If we close Main St, how does traffic redirect?").
16. **Before/After Resolution Verification**: Reviewing staff proof against AI analysis.

**Hub 4: Management Hub (The "Admin")**
17. **Department Management**: Managing dept. hierarchies and roles.
18. **User Management**: Managing Officer and Staff accounts and permissions.
19. **Settings**: Global system thresholds, AI confidence limits, and API configs.

**Hub 5: Learning Hub (The "Archive")**
20. **Civic Analytics**: Temporal trends, heatmaps of "problem zones".
21. **AI Civic Assistant**: Officer-only operational bot for internal query/report generation.
22. **Incident History & Learning**: Individual lifecycle archives for post-mortem analysis.
23. **Geospatial Intelligence**: Specialized map layers for infrastructure assets.

### C. Department Staff Portal (10 Pages/Actions)
*Goal: Operational efficiency and execution.*
1. **Staff Dashboard**: Daily quota, priority tasks, and performance metrics.
2. **Assigned Tasks**: The personal queue of "To-Do" tickets.
3. **Task Details**: Deep-dive into an incident with location, images, and AI instructions.
4. **Accept Assignment**: Action page to claim a ticket and set estimated arrival.
5. **Reject Assignment**: Action page to send a ticket back with a mandatory reason.
6. **Update Work Progress**: Real-time status updates (e.g., "On Site", "In Progress").
7. **Upload Completion Photographs**: Interface for submitting "After" photos.
8. **Repair Verification Status**: Tracking if the AI/Officer has approved the fix.
9. **Task History**: Personal archive of completed work.
10. **Personal Profile**: Certification, contact info, and equipment assigned.

---

## 3. Navigation Structures

### Citizen Navigation (Bottom Bar)
`[Home]` $\rightarrow$ `[Report]` $\rightarrow$ `[My Activity]` $\rightarrow$ `[Nearby]` $\rightarrow$ `[Profile]`

### Officer Navigation (Left Sidebar)
- **Command** $\rightarrow$ `[Dashboard, Digital Twin, Emergency]`
- **Intelligence** $\rightarrow$ `[Predictive Hub, Clustering, Root-Cause, Risk, Weather]`
- **Operations** $\rightarrow$ `[Incidents, Assignments, Coordination, Resources, Simulations, Verification]`
- **Management** $\rightarrow$ `[Departments, Users, Settings]`
- **Learning** $\rightarrow$ `[Analytics, History, AI Assistant, Geo-Intel]`

### Staff Navigation (Top Bar)
`[Dashboard]` $\rightarrow$ `[My Queue]` $\rightarrow$ `[Active Task]` $\rightarrow$ `[History]` $\rightarrow$ `[Profile]`

---

## 4. Feature Mapping & Responsibilities (The 21 Features)

| Feature | Primary Portal | Responsibility Flow |
| :--- | :--- | :--- |
| **1. Multimodal Reporting** | Citizen | User (Uploads) $\rightarrow$ AI (Recommends Tags) $\rightarrow$ Officer (Verifies) |
| **2. AI Problem Detection** | Officer | AI (Identifies pattern) $\rightarrow$ Officer (Reviews/Validates) |
| **3. AI Verification (Input)** | Citizen/Officer | Report Submitted $\rightarrow$ AI (Trust/Relevance/Duplicates) $\rightarrow$ Findings $\rightarrow$ Human Review (if uncertain) $\rightarrow$ Officer approves/rejects |
| **4. Incident Clustering** | Officer | AI (Groups reports) $\rightarrow$ Officer (Merges into Event) |
| **5. Geospatial Intel** | Officer | Database (PostGIS) $\rightarrow$ Digital Twin (Renders) |
| **6. Predictive Intel** | Officer | AI (Forecasts) $\rightarrow$ Officer (Pre-emptively assigns) |
| **7. Root-Cause Analysis** | Officer | AI (Analyzes clusters) $\rightarrow$ Officer (Identifies systemic flaw) |
| **8. Impact & Severity** | Officer | AI (Proposes Score based on visual damage, location, population, and risks) $\rightarrow$ Officer (Reviews Logic/Overrides) |
| **9. Live Digital Twin** | Officer | Real-time Socket $\rightarrow$ Map Engine (Visualizes) |
| **10. Weather Intel** | Officer | External API $\rightarrow$ Map Layer (Overlay) |
| **11. Emergency Mode** | Officer | Officer (Triggers) $\rightarrow$ System (Prioritizes all alerts) |
| **12. Auto Dept Assignment**| Officer/Staff | AI (Suggests Dept) $\rightarrow$ Officer (Approves) $\rightarrow$ Staff (Receives) |
| **13. Cross-Dept Coord** | Staff/Officer | Staff (Requests) $\rightarrow$ Officer (Approves) $\rightarrow$ Other Dept (Assigned) |
| **14. Resource Opt.** | Officer/Staff | Officer (Allocates Pool) $\rightarrow$ Staff (Executes) |
| **15. What-If Simulation** | Officer | Officer (Inputs Params) $\rightarrow$ AI (Predicts Outcome) |
| **16. AI Verification (Resolution)**| Staff/Officer | Staff Uploads Photo $\rightarrow$ AI (Analyzes visible changes vs original) $\rightarrow$ Human Review (if uncertain) $\rightarrow$ Officer approves/requests more work |
| **17. Resolution Conf.** | Citizen | System (Notifies) $\rightarrow$ Citizen (Validates) |
| **18. Civic Analytics** | Officer | DB (Aggregation) $\rightarrow$ Dashboard (Charts) |
| **19. AI Civic Assistant** | Officer | Officer (Query) $\rightarrow$ LLM (RAG on authorized records) $\rightarrow$ Officer |
| **20. Incident History** | Officer/Staff | DB (Lifecycle Log) $\rightarrow$ Timeline View |
| **21. Cascading Risk** | Officer | AI (Models Chain Reaction) $\rightarrow$ Officer (Mitigates) |

---

## 5. Exhaustive Database Planning

### Storage Mapping
- **Supabase PostgreSQL**: All relational data, users, roles, incident metadata.
- **PostGIS**: All spatial data (`GEOMETRY` points for incidents, `MULTIPOLYGON` for risk zones/neighborhoods).
- **Supabase Storage**: Raw images (Before/After), Voice recordings, PDF reports.
- **External APIs**: OpenWeatherMap (Weather), Map Engine (Base layers).

### Entity Relationship Matrix

#### **Core (Identity & Organization)**
- **Users**: Central auth table. $\rightarrow$ $1:1$ Citizen Profile or $1:1$ Staff Member.
- **Roles**: Defines RBAC (Citizen, Officer, Staff). $\rightarrow$ $N:1$ User.
- **Citizen Profiles**: Minimal identity data. $\rightarrow$ $1:1$ User.
- **Departments**: Municipal divisions (e.g., Water, Roads). $\rightarrow$ $1:N$ Staff Members.
- **Staff Members**: Employee details and certifications. $\rightarrow$ $N:1$ Department.

#### **Incident Lifecycle (The Process)**
- **Incidents**: Core report entity. $\rightarrow$ $N:1$ User, $1:1$ Location, $1:N$ Media.
- **Incident Locations**: PostGIS geometry. $\rightarrow$ $1:1$ Incident.
- **Incident Media**: Before/After photos, audio. $\rightarrow$ $N:1$ Incident.
- **AI Detection Results**: Initial AI classification. $\rightarrow$ $1:1$ Incident.
- **AI Verification Records (Input)**: Trust/Duplicate scores for new reports. $\rightarrow$ $1:1$ Incident.
- **Human-Validation Records**: Log of officer overrides/approvals. Includes: Related incident/AI assessment, original recommendation, reviewer ID, decision (approve/reject/modify), corrected value, reason for modification, timestamp, and supporting evidence. $\rightarrow$ $N:1$ Incident.
- **Incident Clusters**: Groups of related incidents. $\rightarrow$ $1:N$ Incident.
- **Incident Relationships**: Links between incidents (e.g., "Caused by"). $\rightarrow$ $N:N$ Incident.

#### **Intelligence (The Brain)**
- **Root-Cause Assessments**: AI-generated systemic analysis. $\rightarrow$ $1:1$ Incident Cluster.
- **Severity & Impact Assessments**: Quantitative risk scoring. $\rightarrow$ $1:1$ Incident.
- **Predictions**: Forecasted failures. $\rightarrow$ $N:1$ Incident Cluster/Location.
- **Risk History**: Temporal log of risk levels. $\rightarrow$ $1:1$ Location.

#### **Operations (The Execution)**
- **Weather Records**: Environmental context. $\rightarrow$ $N:1$ Incident (Temporal/Spatial match).
- **Department Assignments**: Record of which dept is handling what. $\rightarrow$ $N:1$ Incident.
- **Staff Tasks**: Individual work tickets. $\rightarrow$ $N:1$ Incident, $N:1$ Staff Member.
- **Task Progress History**: Log of status changes (e.g., "In Progress"). $\rightarrow$ $1:N$ Staff Task.
- **Resource Records**: Equipment/Vehicle registry. $\rightarrow$ $N:1$ Department.
- **Resource Allocation History**: Log of resource usage. $\rightarrow$ $N:1$ Staff Task.

#### **Closing (The Validation)**
- **Simulation Results**: Outcomes of "What-If" scenarios. $\rightarrow$ $N:1$ Officer.
- **Before/After Verification Records**: AI-driven repair proof. $\rightarrow$ $1:1$ Staff Task.
- **Citizen Resolution Confirmations**: Final user sign-off. $\rightarrow$ $1:1$ Incident.

#### **System (The Infrastructure)**
- **Notifications**: Alerts sent to users. $\rightarrow$ $N:1$ User.
- **Incident History**: Immutable audit trail of incident states. $\rightarrow$ $1:N$ Incident.
- **Audit Logs**: System-wide action logs for compliance. $\rightarrow$ $N:1$ User.

---

## 6. Detailed AI Integration

### AI Humility & Guardrails
- **Classification $\neq$ Fact**: All AI outputs are treated as *recommendations*.
- **Human-in-the-Loop**: Results below the confidence threshold (defined in `Settings`) MUST be flagged for human review.

### AI Civic Assistant (Redesign)
- **Primary Persona**: An operational tool for Municipal Officers.
- **Access Control**: Restricted strictly to Officers. Citizens and Staff do not have unrestricted access.
- **Technical Guardrails**:
    - **RAG (Retrieval-Augmented Generation)**: The assistant queries authorized database records (Incidents, Analytics, Predictions) to ground its answers.
    - **RBAC Compliance**: The AI can only retrieve data that the querying Officer has permission to see.
    - **Supporting Role**: The AI provides evidence-based supporting information and summaries rather than inventing authoritative answers.

### Verification Pipelines
- **Input Verification (Feature 3)**: 
    Report Submitted $\rightarrow$ AI Analysis (Trust/Relevance/Duplicates) $\rightarrow$ Findings Generated $\rightarrow$ Uncertain cases to Human Review $\rightarrow$ Officer approves/rejects.
- **Resolution Verification (Feature 16)**: 
    Staff Uploads Completion Photo $\rightarrow$ AI analyzes visible changes vs. original report $\rightarrow$ Uncertain cases to Human Review $\rightarrow$ Officer approves completion or requests more work.

---

## 7. Digital Twin Planning

### Layer Organization
1. **Base Layer**: Map Engine Vector Tiles.
2. **Infrastructure Layer**: Static assets (Water mains, Power grids).
3. **Incident Layer**: Markers (Color-coded by severity).
4. **Cluster Layer**: Halos around groups of incidents.
5. **Heatmap Layer**: Gradient overlay of "Problem Density".
6. **Risk Zone Layer**: Polygons of predicted failure areas.
7. **Weather Layer**: Animated overlays.
8. **Active Crew Layer**: Moving markers (**Strictly Restricted Access**).

### Interaction Model
- **Drill-down**: Global View $\rightarrow$ Zoom into **Cluster** (Click Cluster) $\rightarrow$ Expand to **Incident List** (Side Panel) $\rightarrow$ Select **Incident** (Open Details Page).
- **Contextual Actions**: Right-click $\rightarrow$ "Simulate Road Closure" $\rightarrow$ Trigger What-If Simulation.

---

## 8. Shared Components & Tech Stack

### Component Library
- **Atomic**: `SeverityBadge`, `ConfidencePill`, `StatusStepper`, `DynamicInput`.
- **Molecular**: 
    - `IntelligenceCard`: AI prediction + confidence + **Logic Breakdown (Reasons, Evidence, Uncertainty)**.
    - `TimelineView`: Visual lifecycle of a ticket.
    - `MapOverlayPanel`: Layer toggling controls.
    - `ResourceTile`: Crew status + current location coordinates.
- **Organism**:
    - `DigitalTwinCanvas`: Full map engine.
    - `AnalysisPanel`: Root-Cause and Severity details.
    - `MultimodalForm`: Unified voice/image/text input handler.
- **State Components**: `GlobalLoader`, `EmptyState`, `ErrorBoundary`, `SuccessToast`.

---

## 9. User Navigation Flows

1. **Citizen Reporting Flow**:
   `Homepage` $\rightarrow$ `Report a Problem` $\rightarrow$ `Multimodal Upload` $\rightarrow$ `AI Verification (Input)` $\rightarrow$ `My Complaints (Tracking)` $\rightarrow$ `Resolution Notification` $\rightarrow$ `Resolution Confirmation`.

2. **Officer Intelligence Flow**:
   `Digital Twin` $\rightarrow$ `Predictive Hub` $\rightarrow$ `Incident Management` (Reviews AI Suggestion) $\rightarrow$ `Department Assignment` $\rightarrow$ `Verification Page` (Reviews Proof).

3. **Staff Execution Flow**:
   `Staff Dashboard` $\rightarrow$ `Assigned Tasks` $\rightarrow$ `Accept Assignment` $\rightarrow$ `Task Details` $\rightarrow$ `Update Work Progress` $\rightarrow$ `Upload Completion Photos` $\rightarrow$ `Repair Verification Status`.

---

## 10. Updated Frontend Folder Structure

```text
src/
├── assets/             # Brand assets, SVG icons
├── components/         # Atomic & Molecular UI
│   ├── common/         # Badges, Buttons, Loaders
│   ├── map/            # MapWrapper, LayerControls, Heatmap
│   ├── ai/             # IntelligenceCard, BotChat, DiffViewer
│   └── forms/          # MultimodalInput, VerificationForm
├── features/            # Domain Logic
│   ├── reporting/      # Submission, Voice-to-Text logic
│   ├── intelligence/   # Prediction, Clustering, Cascade logic
│   ├── operations/    # Assignment, Resource, Coordination logic
│   └── twin/           # Real-time socket, Layer state, GeoJSON helpers
├── hooks/              # useAuth, useMap, useSupabaseRealtime
├── layouts/            # CitizenLayout, OfficerLayout, StaffLayout
├── pages/              # Route-level components
│   ├── citizen/        # (11 pages)
│   ├── officer/        # (Hubs: Command, Intel, Ops, Mgmt, Learning)
│   └── staff/        # (10 pages)
├── store/              # (Optional) Zustand stores (uiStore, mapStore, authStore)
└── utils/              # PostGIS helpers, AI prompt templates, date-fns
```

---

## 11. Privacy, Permissions & Security

### Citizen Identity & Privacy
- **Minimalism**: Collect only strictly necessary information. No requirement for unnecessary identity documents (e.g., passport scans) during registration.
- **Verification Tiers**:
    - **Authenticated User**: Has a verified email/account; can report issues.
    - **Verified Resident**: Has proven residency in the municipality (via address validation); may receive priority alerts or specialized voting rights on city projects.
- **Digital Twin Privacy**: Explicitly prohibit the exposure of private citizen details (names, exact home addresses, phone numbers) on the public-facing Digital Twin or Heatmaps. Only aggregated, anonymonymized data is visible.

### Authorization Model
- **Backend Enforcement**: All access control is enforced via **Supabase Row Level Security (RLS)**.
- **Staff Tracking**: Real-time tracking is only active while a staff member is assigned to an **Active Task**. Only authorized Officers can view this data.
