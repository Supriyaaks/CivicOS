# AI Integration Plan: CivicOS

This document outlines the audit and implementation strategy for integrating Local AI (Ollama) into the CivicOS municipal management system.

## 1. AI Feature Audit

All currently identified AI features in the frontend are in **DEMO/SIMULATED** mode using mock data or hardcoded logic.

| Feature | Frontend Location | Required Input Data | Expected Output | Current State |
| :--- | :--- | :--- | :--- | :--- |
| **Incident Clustering** | `officer/intelligence/IncidentClustering.tsx` | List of all active `Incidents` | Grouped `IncidentCluster` objects with reasoning and confidence scores | Mock data from `mccStore` |
| **Predictive Intelligence**| `officer/intelligence/PredictiveIntelligence.tsx` | Historical `Incident` data, `Department` workload, time/date | Area-based risk levels, probability of failure, forecast text | Hardcoded arrays/randomized |
| **Root-Cause Analysis** | `officer/intelligence/RootCauseAnalysis.tsx` | Single `Incident` details, `Evidence`, `Timeline` | Probable root cause, technical explanation, confidence | Mocked/Simulated |
| **Impact & Severity** | `officer/intelligence/ImpactSeverity.tsx` | `Incident` details, `Location` (Sector), `SupportingDepts` | Impact score (1-100), severity level, affected population estimate | Mocked/Simulated |
| **Cascading Risk** | `officer/intelligence/CascadingRisk.tsx` | `Incident` details, `InfrastructureMap` (conceptual) | Chain of potential failures, risk probability, mitigation advice | Mocked/Simulated |
| **Weather Intel** | `officer/intelligence/WeatherIntelligence.tsx` | `Location`, current weather API data, historical trends | Impact of weather on active incidents, predicted surges in specific categories | Mocked/Simulated |
| **AI Civic Assistant** | `officer/learning/AICivicAssistant.tsx` | User query, current `Incidents` & `Departments` state | Natural language answers, operational summaries, resource suggestions | Simulated logic in `generateSimulatedResponse()` |

---

## 2. Backend Data Sources (Prisma Schema)

The following models will be used as context for the AI:
- `Incident`: Core data for all analysis.
- `User` & `Department`: For workload and personnel context.
- `TaskTimeline`: To provide a chronological history for Root Cause and Predictive analysis.
- `Evidence`: For analyzing technical completion proofs.
- `IncidentCluster`: To persist AI-generated groupings.
- `AIInsight`: To store specific AI-generated conclusions for incidents.

---

## 3. Proposed AI Architecture

To keep the regular API logic clean, we will implement a **Service-Based AI Layer**.

### Component Diagram
`Frontend` $\rightarrow$ `Regular API Route (Express)` $\rightarrow$ `AIService (Internal)` $\rightarrow$ `Ollama API (localhost:11434)` $\rightarrow$ `LLM (Llama 3.2)`

### AI Service Design
The `AIService` will be a singleton class in `backend/src/services/ai.service.ts` responsible for:
1. **Context Window Management**: Fetching relevant database records and formatting them into a "System Prompt".
2. **Prompt Engineering**: Using structured templates for different analysis types (e.g., "You are a municipal risk analyst...").
3. **Ollama Integration**: Handling the HTTP requests to the local Ollama API.
4. **Output Parsing**: Transforming raw LLM text into structured JSON that the frontend expects.

---

## 4. Local Model Recommendations

Since the system runs on a developer's machine, we prioritize efficiency and speed:
- **Primary Model**: `llama3.2:latest` (3.2B parameters). 
  - **Reason**: Extremely efficient, excellent for summarization and reasoning, already installed on the system.
- **Alternative**: `mistral` or `phi3` if specific reasoning tasks require different styles.

---

## 5. Implementation Phases

### Phase 1: AI Infrastructure (Core)
- Implement `AIService` in the backend.
- Establish connectivity with Ollama.
- Create a generic `/api/v1/ai/prompt` internal utility for testing.

### Phase 2: Analytical Features (Structured Output)
- Implement **Incident Clustering** $\rightarrow$ API returns JSON of clusters.
- Implement **Root-Cause & Risk Analysis** $\rightarrow$ API returns structured insights.
- Implement **Impact/Severity Scoring**.

### Phase 3: Conversational Intelligence
- Replace `generateSimulatedResponse` in `AICivicAssistant.tsx` with a call to a new `/api/v1/ai/chat` endpoint.
- Implement "Context Injection" (sending current incident stats as part of the chat history).

### Phase 4: Advanced Intelligence
- Integrate **Weather API** data into the AI prompt for `WeatherIntelligence`.
- Implement **Predictive Forecasting** based on historical incident patterns.

---

## 6. Input/Output Contracts (Example: Root-Cause)

**Input**: `IncidentId`
**Backend Process**:
1. Fetch `Incident` + `TaskTimeline` + `Evidence` from DB.
2. Prompt: `"Analyze this incident: {data}. What is the most likely root cause?"`
**Output**: `{ "rootCause": "...", "confidence": "...", "explanation": "..." }`
