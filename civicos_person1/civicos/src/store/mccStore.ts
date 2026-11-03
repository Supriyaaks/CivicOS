import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { useCitizenStore } from './citizenStore';
import { Incident, Department, Cluster, MccUser, ResourcePool, WorkSession, ChecklistItem, Blocker, ResourceRequest, Milestone, JournalEntry, TaskEvidence, VerificationSubmission, TaskTimelineEntry } from './mccTypes';

export type TaskStatus = 'Dispatching' | 'Accepted' | 'Travelling' | 'Arrived' | 'In Progress' | 'Paused' | 'Blocked' | 'Completed' | 'Awaiting Verification' | 'Under Review' | 'Verified' | 'Rework Required' | 'Rework In Progress' | 'Resubmitted' | 'Rejected';

export type { MccUser, TaskEvidence };

export const TASK_LIFECYCLE: Record<string, string[]> = {
  'Dispatching': ['Accepted', 'Rejected'],
  'Accepted': ['Travelling', 'Rejected'],
  'Travelling': ['Arrived', 'Rejected'],
  'Arrived': ['In Progress', 'Rejected'],
  'In Progress': ['Paused', 'Blocked', 'Completed', 'Rejected'],
  'Paused': ['In Progress', 'Rejected'],
  'Blocked': ['In Progress', 'Rejected'],
  'Completed': ['Awaiting Verification', 'Rejected'],
  'Awaiting Verification': ['Under Review', 'Verified', 'Rework Required', 'Rejected'],
  'Under Review': ['Verified', 'Rework Required', 'Rejected'],
  'Rework Required': ['Rework In Progress', 'Rejected'],
  'Rework In Progress': ['Completed', 'Rejected'],
  'Resubmitted': ['Awaiting Verification', 'Rejected'],
  'Verified': [],
  'Rejected': [],
};

interface MccState {
  incidents: Incident[];
  departments: Department[];
  clusters: Cluster[];
  resourcePools: Record<string, ResourcePool>;
  aiDecisions: Record<string, {
    incidentId: string;
    analysisType: string;
    decision: 'Accepted' | 'Rejected';
    timestamp: string;
  }>;
  users: MccUser[];
  settings: Record<string, any>;
  taskTimelines: Record<string, TaskTimelineEntry[]>;
  completionEvidence: Record<string, TaskEvidence[]>;
  verificationSubmissions: Record<string, VerificationSubmission[]>;
  verificationStatus: Record<string, {
    status: 'Pending' | 'Approved' | 'More Evidence Requested';
    officerNote?: string;
    timestamp?: string;
  }>;
  workSessions: Record<string, WorkSession>;
  checklists: Record<string, Record<string, ChecklistItem[]>>;
  blockers: Record<string, Blocker[]>;
  resourceRequests: Record<string, ResourceRequest[]>;
  milestones: Record<string, Milestone[]>;
  journal: Record<string, JournalEntry[]>;
  isLoading: boolean;

  fetchIncidents: () => Promise<void>;
  fetchDepartments: () => Promise<void>;
  updateIncident: (id: string, updates: Partial<Incident>) => Promise<void>;
  setTaskStatus: (incidentId: string, status: any) => Promise<void>;
  updateSupportingDepts: (incidentId: string, deptName: string) => Promise<void>;
  assignIncident: (incidentId: string, staffId: string) => Promise<void>;
  reallocateResources: (deptId: string, personnelDelta: number, vehiclesDelta: number, equipmentDelta: number) => Promise<void>;
  setAIDecision: (decisionId: string, incidentId: string, analysisType: string, decision: 'Accepted' | 'Rejected') => Promise<void>;
  updateDepartment: (id: string, updates: Partial<Department>) => Promise<void>;
  updateUser: (id: string, updates: Partial<MccUser>) => Promise<void>;
  updateSettings: (updates: Record<string, any>) => void;
  addTimelineEntry: (incidentId: string, entry: TaskTimelineEntry) => Promise<void>;
  updateProgress: (incidentId: string, percentage: number, note?: string) => Promise<void>;
  updateMilestone: (incidentId: string, milestoneId: string, updates: Partial<Milestone>) => Promise<void>;
  addJournalEntry: (incidentId: string, entry: Omit<JournalEntry, 'id'>) => Promise<void>;
  addCompletionEvidence: (incidentId: string, evidence: TaskEvidence) => Promise<void>;
  setVerificationStatus: (incidentId: string, status: 'Pending' | 'Approved' | 'More Evidence Requested', note?: string) => Promise<void>;
  submitForVerification: (incidentId: string, summary: string, evidenceIds: string[]) => Promise<void>;
  recordOfficerDecision: (submissionId: string, decision: 'Verified' | 'Rework Required', feedback: { note: string, corrections: string[] }) => Promise<void>;
  removeCompletionEvidence: (incidentId: string, evidenceId: string) => Promise<void>;
  manageWorkSession: (incidentId: string, action: 'start' | 'pause' | 'resume' | 'stop') => Promise<void>;
  initializeChecklist: (incidentId: string, category: string) => Promise<void>;
  updateChecklistItem: (incidentId: string, checklistId: string, itemId: string, isCompleted: boolean) => Promise<void>;
  reportBlocker: (incidentId: string, blocker: Omit<Blocker, 'id' | 'reportedAt'>) => Promise<void>;
  resolveBlocker: (incidentId: string, blockerId: string, resolution: string) => Promise<void>;
  requestResource: (incidentId: string, request: Omit<ResourceRequest, 'id'>) => Promise<void>;
}

export const DEFAULT_INCIDENTS: Incident[] = [
  {
    id: 'INC-101',
    category: 'Pothole',
    description: 'Severe road surface fissure and pothole impeding arterial traffic lane.',
    location: 'Sector 4, Main Arterial Junction',
    date: new Date().toISOString(),
    status: 'Under Review',
    severity: 'Critical',
    priority: 'High',
    assignedDept: 'Roads & Infrastructure',
    supportingDepts: ['Traffic & Public Safety'],
    evidence: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
    aiConfidence: '94%',
    rootCause: 'Heavy monsoon runoff coupled with compromised sub-base compaction',
    impactScore: 78,
    cascadeRisk: ['Traffic Gridlock', 'Emergency Transit Delay'],
    progress: 45,
    aiVerificationStatus: 'verified',
    detectedCategory: 'Pothole',
    isDuplicate: false,
  },
  {
    id: 'INC-102',
    category: 'Garbage or Litter',
    description: 'Commercial refuse and plastic waste accumulation obstructing public footpath.',
    location: 'Downtown Core, Market Lane',
    date: new Date().toISOString(),
    status: 'In Progress',
    severity: 'Medium',
    priority: 'Normal',
    assignedDept: 'Waste Management & Sanitation',
    supportingDepts: [],
    evidence: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600',
    aiConfidence: '91%',
    rootCause: 'Overflowing municipal disposal bin during peak market hours',
    impactScore: 52,
    cascadeRisk: ['Sanitation Hazard', 'Storm Drain Clogging'],
    progress: 60,
    aiVerificationStatus: 'verified',
    detectedCategory: 'Garbage or Litter',
    isDuplicate: false,
  },
  {
    id: 'INC-103',
    category: 'Streetlight or Electrical',
    description: 'Consecutive street lighting outage causing hazardous visibility along North District crossroad.',
    location: 'North District, 5th Avenue',
    date: new Date().toISOString(),
    status: 'Awaiting Verification',
    severity: 'High',
    priority: 'High',
    assignedDept: 'Electrical & Street Lighting',
    supportingDepts: [],
    evidence: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=600',
    aiConfidence: '87%',
    rootCause: 'Substation circuit breaker trip due to high transient surge',
    impactScore: 68,
    cascadeRisk: ['Pedestrian Safety Incident', 'Night Crime Vulnerability'],
    progress: 90,
    aiVerificationStatus: 'needs_review',
    detectedCategory: 'Streetlight',
    isDuplicate: false,
  },
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-roads', name: 'Roads & Infrastructure', code: 'ROADS', staff: 12, activeIncidents: 4, workload: 'Moderate' },
  { id: 'dept-sanitation', name: 'Waste Management & Sanitation', code: 'SAN', staff: 18, activeIncidents: 6, workload: 'High' },
  { id: 'dept-electrical', name: 'Electrical & Street Lighting', code: 'ELEC', staff: 8, activeIncidents: 2, workload: 'Low' },
  { id: 'dept-water', name: 'Water Supply & Drainage', code: 'WATER', staff: 10, activeIncidents: 3, workload: 'Moderate' },
  { id: 'dept-traffic', name: 'Traffic & Public Safety', code: 'TRAF', staff: 6, activeIncidents: 1, workload: 'Low' },
];

export const DEFAULT_CLUSTERS: Cluster[] = [
  { id: 'CLUST-001', incidents: ['INC-101'], category: 'Potholes & Road Hazards', area: 'Sector 4', confidence: '94%', status: 'Confirmed', reason: 'Cluster of road anomalies along Main Arterial Road' },
  { id: 'CLUST-002', incidents: ['INC-102'], category: 'Litter & Waste Accumulation', area: 'Downtown Core', confidence: '91%', status: 'Investigating', reason: 'High-density commercial refuse and packaging waste' },
  { id: 'CLUST-003', incidents: ['INC-103'], category: 'Electrical & Street Lighting', area: 'North District', confidence: '87%', status: 'Confirmed', reason: 'Multiple streetlight fixtures dark along primary corridor' },
];

export const DEFAULT_USERS: MccUser[] = [
  { id: 'usr-officer-1', name: 'Officer Sarah Chen', role: 'Chief Municipal Officer', dept: 'Operations', status: 'Active', contact: '+1 (555) 019-2834' },
  { id: 'usr-officer-2', name: 'Inspector Marcus Vance', role: 'Field Supervisor', dept: 'Roads & Infrastructure', status: 'Active', contact: '+1 (555) 019-5821' },
  { id: 'usr-officer-3', name: 'Elena Rostova', role: 'Sanitation Lead', dept: 'Waste Management & Sanitation', status: 'Active', contact: '+1 (555) 019-7412' },
];

export const useMccStore = create<MccState>()(
  persist(
    (set) => ({
      incidents: DEFAULT_INCIDENTS,
      departments: DEFAULT_DEPARTMENTS,
      clusters: DEFAULT_CLUSTERS,
      users: DEFAULT_USERS,
      settings: { autoExpand: true, aiPriority: true, highContrast: false },
      resourcePools: {},
      aiDecisions: {},
      taskTimelines: {},
      completionEvidence: {},
      verificationSubmissions: {},
      verificationStatus: {},
      workSessions: {},
      checklists: {},
      blockers: {},
      resourceRequests: {},
      milestones: {},
      journal: {},
      isLoading: false,

      fetchIncidents: async () => {
        set({ isLoading: true });

        // Primary source of truth: Person 4 Express Backend & PostgreSQL
        try {
          const backendRes = await fetch('/api/v1/incidents');
          if (backendRes.ok) {
            const backendJson = await backendRes.json();
            const backendIncidents = backendJson.data || [];
            if (backendIncidents.length > 0) {
              const mappedBackend: Incident[] = backendIncidents.map((bi: any) => ({
                id: bi.incidentCode || bi.id,
                category: bi.category,
                description: bi.description,
                location: bi.location,
                date: bi.createdAt || new Date().toISOString(),
                status: bi.status === 'InProgress' ? 'In Progress' : bi.status,
                severity: bi.severity || 'Medium',
                priority: bi.priority || 'Normal',
                assignedDept: bi.department?.name || bi.departmentId || 'Unassigned',
                departmentId: bi.departmentId,
                supportingDepts: bi.supportingDepts || [],
                evidence: bi.evidenceUrl || (bi.evidence && bi.evidence[0] ? bi.evidence[0].url : ''),
                aiConfidence: bi.aiConfidence || '90%',
                rootCause: bi.rootCause || 'Under municipal review',
                impactScore: bi.impactScore || 50,
                cascadeRisk: ['Local infrastructure stress'],
                progress: bi.currentStage ? bi.currentStage * 20 : 20,
                ward: bi.ward || 'Ward 14',
                latitude: bi.latitude != null ? bi.latitude : 12.9716,
                longitude: bi.longitude != null ? bi.longitude : 77.5946,
                resolutionDescription: bi.resolutionDescription,
                resolutionDate: bi.resolutionDate,
                aiVerificationStatus: bi.currentStage >= 2 ? 'verified' : 'pending',
                detectedCategory: bi.category,
                isDuplicate: false,
              }));
              set({ incidents: mappedBackend, isLoading: false });
              return;
            }
          }
        } catch (err) {
          console.warn('[MccStore] Person 4 Express fetch notice:', err);
        }

        // Secondary fallback: Supabase complaints
        try {
          const { data, error } = await supabase
            .from('complaints')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            const mappedIncidents: Incident[] = data.map((d: any) => ({
              id: d.id,
              category: d.category,
              description: d.description,
              location: d.location,
              date: d.created_at || new Date().toISOString(),
              status: d.status || 'Pending',
              severity: (d.impact_score && d.impact_score > 70) ? 'Critical' : (d.impact_score && d.impact_score > 40) ? 'High' : 'Medium',
              priority: (d.impact_score && d.impact_score > 60) ? 'High' : 'Normal',
              assignedDept: d.assigned_dept_id || 'Unassigned',
              supportingDepts: d.supporting_depts || [],
              evidence: d.evidence_url || '',
              aiConfidence: d.ai_confidence || (d.ai_results?.verification?.confidence ? `${Math.round(d.ai_results.verification.confidence * 100)}%` : 'N/A'),
              rootCause: d.root_cause || (d.ai_results?.verification?.explanation || 'Pending inspection'),
              impactScore: d.impact_score || 50,
              cascadeRisk: d.cascade_risk || [],
              progress: d.progress || 0,
              aiVerificationStatus: d.ai_verification_status,
              detectedCategory: d.detected_category,
              isDuplicate: Boolean(d.is_duplicate),
              aiResults: d.ai_results,
              resolutionVerification: d.resolution_verification,
            }));
            const existingIds = new Set(mappedIncidents.map(i => i.id));
            const merged = [...mappedIncidents, ...DEFAULT_INCIDENTS.filter(i => !existingIds.has(i.id))];
            set({ incidents: merged, isLoading: false });
            return;
          }
        } catch (err) {
          console.warn('[MccStore] Supabase fetchIncidents error, falling back to local store:', err);
        }

        // Resilient fallback: sync from citizenStore complaints + DEFAULT_INCIDENTS
        const localComplaints = useCitizenStore.getState().complaints;
        const fallbackIncidents: Incident[] = localComplaints.map((c) => ({
          id: c.id,
          category: c.category,
          description: c.description,
          location: c.location,
          date: c.date ? `${c.date}T12:00:00Z` : new Date().toISOString(),
          status: c.status,
          severity: c.category.includes('Pothole') || c.category.includes('Open manhole') ? 'High' : 'Medium',
          priority: 'Normal',
          assignedDept: c.department || 'Unassigned',
          supportingDepts: [],
          evidence: c.evidence || '',
          aiConfidence: c.aiConfidence ? `${Math.round(c.aiConfidence * 100)}%` : '85%',
          rootCause: c.aiResults?.verification?.explanation || 'Awaiting municipal inspection',
          impactScore: 65,
          cascadeRisk: ['Traffic Congestion'],
          progress: c.currentStage * 12,
          aiVerificationStatus: c.aiVerificationStatus,
          detectedCategory: c.detectedCategory,
          isDuplicate: c.isDuplicate,
          aiResults: c.aiResults,
          resolutionVerification: c.resolutionVerification,
        }));

        const existingIds = new Set(fallbackIncidents.map(i => i.id));
        const merged = [...fallbackIncidents, ...DEFAULT_INCIDENTS.filter(i => !existingIds.has(i.id))];
        set({ incidents: merged, isLoading: false });
      },

      fetchDepartments: async () => {
        // Primary source of truth: Person 4 Express Backend & PostgreSQL
        try {
          const backendRes = await fetch('/api/v1/departments');
          if (backendRes.ok) {
            const backendJson = await backendRes.json();
            const depts = backendJson.data || [];
            if (depts.length > 0) {
              set({
                departments: depts.map((d: any) => ({
                  id: d.id,
                  name: d.name,
                  code: d.code,
                  staff: d.staffCount || 15,
                  staffCount: d.staffCount || 15,
                  personnelCount: d.staffCount || 15,
                  activeIncidents: d._count?.incidents || 0,
                  workload: d.workload || 'Moderate',
                  workloadStatus: d.workload || 'Moderate',
                }))
              });
              return;
            }
          }
        } catch (err) {
          console.warn('[MccStore] Person 4 fetchDepartments notice:', err);
        }

        try {
          const { data, error } = await supabase.from('departments').select('*');
          if (!error && data && data.length > 0) {
            set({ departments: data });
            return;
          }
        } catch {
          // fall through to default departments
        }
        set({
          departments: [
            { id: 'dept-roads', name: 'Roads & Infrastructure', code: 'ROADS', staff: 12, activeIncidents: 4, workload: 'Moderate' },
            { id: 'dept-sanitation', name: 'Solid Waste Management', code: 'SAN', staff: 18, activeIncidents: 6, workload: 'High' },
            { id: 'dept-electrical', name: 'Electrical Department', code: 'ELEC', staff: 8, activeIncidents: 2, workload: 'Low' },
            { id: 'dept-water', name: 'Water and Drainage', code: 'WATER', staff: 10, activeIncidents: 3, workload: 'Moderate' },
            { id: 'dept-traffic', name: 'Traffic & Public Safety', code: 'SAFETY', staff: 6, activeIncidents: 1, workload: 'Low' },
          ]
        });
      },

      updateIncident: async (id, updates) => {
        // 1. Persist directly to Person 4 Express Backend & PostgreSQL
        try {
          const payload: any = { ...updates };
          if (payload.status === 'In Progress') payload.status = 'InProgress';
          if (payload.assignedDept && !payload.departmentId) {
            const depts = useMccStore.getState().departments;
            const match = depts.find(d => d.name.toLowerCase() === payload.assignedDept.toLowerCase() || d.code.toLowerCase() === payload.assignedDept.toLowerCase());
            if (match) payload.departmentId = match.id;
          }

          await fetch(`/api/v1/incidents/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => {});

          if (updates.status) {
            const targetStatus = updates.status === 'In Progress' ? 'InProgress' : updates.status;
            const targetStage = (updates as any).currentStage || 3;
            await fetch(`/api/v1/incidents/${encodeURIComponent(id)}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: targetStatus,
                currentStage: targetStage,
                note: updates.resolutionDescription || `Updated to ${updates.status} by officer.`
              })
            }).catch(() => {});
          }
        } catch (err) {
          console.warn('[MccStore] Backend updateIncident notice:', err);
        }

        // 2. Secondary sync to Supabase
        try {
          await supabase.from('complaints').update(updates).eq('id', id);
          await supabase.from('audit_logs').insert([{
            entity_type: 'complaint',
            entity_id: id,
            action: 'officer_updated',
            new_data: updates,
          }]);
        } catch (err) {
          // Non-blocking
        }

        // 3. Update local store state
        set((state) => ({ incidents: state.incidents.map(i => i.id === id ? { ...i, ...updates } : i) }));
      },

      setTaskStatus: async (incidentId, status) => {
        try {
          const normStatus = (status === 'In Progress' || status === 'Completed') ? 'InProgress' : status;
          const stage = status === 'Completed' ? 3 : status === 'In Progress' ? 2 : 1;
          await fetch(`/api/v1/incidents/${encodeURIComponent(incidentId)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: normStatus, stage, currentStage: stage, note: `Task status: ${status}` })
          });
        } catch {}
        try {
          await supabase.from('assignments').update({ status }).eq('complaint_id', incidentId);
        } catch {}
        set((state) => ({
          incidents: state.incidents.map(i => i.id === incidentId ? { ...i, status: status as any } : i)
        }));
      },

      updateSupportingDepts: async (incidentId, deptName) => {
        try {
          await fetch(`/api/v1/incidents/${encodeURIComponent(incidentId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supportingDepts: [deptName] })
          });
        } catch {}
        try {
          await supabase.from('complaints').update({ supporting_depts: [deptName] }).eq('id', incidentId);
        } catch {}
        set((state) => ({
          incidents: state.incidents.map(i => i.id === incidentId ? { ...i, supportingDepts: [deptName] } : i)
        }));
      },

      assignIncident: async (incidentId, staffId) => {
        try {
          await fetch(`/api/v1/incidents/${encodeURIComponent(incidentId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignedStaffId: staffId, status: 'InProgress', currentStage: 2 })
          });
        } catch {}
        try {
          await supabase.from('assignments').insert([{
            complaint_id: incidentId,
            staff_id: staffId,
            status: 'Dispatching'
          }]);
          await supabase.from('complaints').update({ status: 'In Progress' }).eq('id', incidentId);
        } catch {}

        set((state) => ({
          incidents: state.incidents.map(i => i.id === incidentId ? { ...i, status: 'In Progress' } : i)
        }));
      },

      updateDepartment: async (id, updates) => {
        const { error } = await supabase.from('departments').update(updates).eq('id', id);
        if (!error) {
          set((state) => ({ departments: state.departments.map(d => d.id === id ? { ...d, ...updates } : d) }));
        }
      },

      updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),

      addTimelineEntry: async (incidentId, entry) => {
        set((state) => ({ taskTimelines: { ...state.taskTimelines, [incidentId]: [...(state.taskTimelines[incidentId] || []), entry] } }));
      },

      updateProgress: async (incidentId, percentage) => {
        const { error } = await supabase.from('complaints').update({ progress: percentage }).eq('id', incidentId);
        if (!error) {
          set((state) => ({ incidents: state.incidents.map(i => i.id === incidentId ? { ...i, progress: percentage } : i) }));
        }
      },

      updateMilestone: async (incidentId, milestoneId, updates) => {
        const { error } = await supabase.from('milestones').update(updates).eq('id', milestoneId);
        if (!error) {
          set((state) => ({
            milestones: { ...state.milestones, [incidentId]: state.milestones[incidentId]?.map(m => m.id === milestoneId ? { ...m, ...updates } : m) || [] }
          }));
        }
      },

      addJournalEntry: async (incidentId, entry) => {
        const { data: ass } = await supabase.from('assignments').select('id').eq('complaint_id', incidentId).single();
        if (!ass) return;
        const { error } = await supabase.from('journals').insert([{ assignment_id: ass.id, ...entry }]);
        if (!error) {
          set((state) => ({ journal: { ...state.journal, [incidentId]: [...(state.journal[incidentId] || []), { ...entry, id: `JRN-${Date.now()}` }] } }));
        }
      },

      addCompletionEvidence: async (incidentId, evidence) => {
        set((state) => ({
          completionEvidence: {
            ...state.completionEvidence,
            [incidentId]: [...(state.completionEvidence[incidentId] || []), evidence]
          }
        }));
        try {
          const { data: ass } = await supabase.from('assignments').select('id').eq('complaint_id', incidentId).single();
          if (ass) {
            await supabase.from('task_evidence').insert([{ assignment_id: ass.id, ...evidence }]);
          }
        } catch {}
      },

      setVerificationStatus: async (incidentId, status, note) => {
        try {
          await fetch(`/api/v1/incidents/${encodeURIComponent(incidentId)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, note })
          });
        } catch {}
        set((state) => ({ verificationStatus: { ...state.verificationStatus, [incidentId]: { status, officerNote: note, timestamp: new Date().toISOString() } } }));
      },

      submitForVerification: async (incidentId, summary, evidenceIds) => {
        try {
          await fetch(`/api/v1/incidents/${encodeURIComponent(incidentId)}/verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary, evidenceIds }),
          });
        } catch (err) {
          console.warn('[MccStore] Verification submission backend notice:', err);
        }

        set((state) => ({
          incidents: state.incidents.map(i => i.id === incidentId ? { ...i, status: 'Awaiting Verification' } : i),
          verificationStatus: {
            ...state.verificationStatus,
            [incidentId]: { status: 'Pending', officerNote: summary, timestamp: new Date().toISOString() }
          }
        }));

        try {
          const { data: ass } = await supabase.from('assignments').select('id').eq('complaint_id', incidentId).single();
          if (ass) {
            await supabase.from('verification_submissions').insert([{
              assignment_id: ass.id, summary, evidence_ids: evidenceIds, status: 'Pending'
            }]);
          }
        } catch {}
      },

      recordOfficerDecision: async (submissionId, decision, feedback) => {
        try {
          await fetch(`/api/v1/incidents/${encodeURIComponent(submissionId)}/verification/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decision: decision === 'Verified' ? 'Approve' : 'Rework',
              note: feedback.note,
              corrections: feedback.corrections,
            }),
          });
        } catch (err) {
          console.warn('[MccStore] Officer decision backend sync notice:', err);
        }

        set((state) => ({
          incidents: state.incidents.map(i => i.id === submissionId ? {
            ...i,
            status: decision === 'Verified' ? 'Resolved' : 'Rework Required',
            resolutionDescription: feedback.note,
          } : i),
          verificationStatus: {
            ...state.verificationStatus,
            [submissionId]: {
              status: decision === 'Verified' ? 'Approved' : 'More Evidence Requested',
              officerNote: feedback.note,
              timestamp: new Date().toISOString(),
            }
          }
        }));
      },

      manageWorkSession: async (incidentId, action) => {
        const { data: ass } = await supabase.from('assignments').select('id').eq('complaint_id', incidentId).single();
        if (!ass) return;
        if (action === 'start') {
          await supabase.from('work_sessions').insert([{ assignment_id: ass.id, start_time: new Date().toISOString(), status: 'Active' }]);
          set((state) => ({ workSessions: { ...state.workSessions, [Date.now().toString()]: { sessionId: Date.now().toString(), incidentId, startTime: new Date().toISOString(), status: 'Active', duration: 0 } } }));
        }
      },

      initializeChecklist: async (incidentId, category) => {
        try {
          const res = await fetch(`/api/v1/incidents/${encodeURIComponent(incidentId)}/checklist`);
          if (res.ok) {
            const json = await res.json();
            if (json.data && json.data.length > 0) {
              set((state) => ({
                checklists: {
                  ...state.checklists,
                  [incidentId]: { main: json.data, [category]: json.data }
                }
              }));
              return;
            }
          }
        } catch {}

        const defaultItems = [
          { id: 'chk-1', label: 'Safety perimeter & warning signs deployed', required: true, isCompleted: false },
          { id: 'chk-2', label: 'Debris cleared & sub-base compacted', required: true, isCompleted: false },
          { id: 'chk-3', label: 'Hot asphalt / repair material applied and leveled', required: true, isCompleted: false },
          { id: 'chk-4', label: 'Final surface inspection & traffic clearance verified', required: true, isCompleted: false },
        ];
        set((state) => ({
          checklists: {
            ...state.checklists,
            [incidentId]: { main: defaultItems, [category]: defaultItems }
          }
        }));
      },

      updateChecklistItem: async (incidentId, checklistId, itemId, isCompleted) => {
        let updatedItems: any[] = [];
        set((state) => {
          const current = state.checklists[incidentId]?.[checklistId] || state.checklists[incidentId]?.['main'] || [];
          updatedItems = current.map(item => item.id === itemId ? { ...item, isCompleted } : item);
          return {
            checklists: {
              ...state.checklists,
              [incidentId]: {
                ...state.checklists[incidentId],
                [checklistId]: updatedItems,
                main: updatedItems,
              }
            }
          };
        });

        try {
          await fetch(`/api/v1/incidents/${encodeURIComponent(incidentId)}/checklist`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: updatedItems }),
          });
        } catch (err) {
          console.warn('[MccStore] Checklist backend sync notice:', err);
        }
      },

      reportBlocker: async (incidentId, blocker) => {
        const { data: ass } = await supabase.from('assignments').select('id').eq('complaint_id', incidentId).single();
        if (!ass) return;
        const { error } = await supabase.from('blockers').insert([{ assignment_id: ass.id, ...blocker, reported_at: new Date().toISOString() }]);
        if (!error) {
          set((state) => ({
            blockers: { ...state.blockers, [incidentId]: [...(state.blockers[incidentId] || []), { ...blocker, id: `BLK-${Date.now()}`, reportedAt: new Date().toISOString() }] },
            incidents: state.incidents.map(i => i.id === incidentId ? { ...i, status: 'Blocked' } : i),
          }));
        }
      },

      resolveBlocker: async (incidentId, blockerId, resolution) => {
        const { error } = await supabase.from('blockers').update({ resolution, resolved_at: new Date().toISOString() }).eq('id', blockerId);
        if (!error) {
          set((state) => ({
            blockers: { ...state.blockers, [incidentId]: state.blockers[incidentId]?.map(b => b.id === blockerId ? { ...b, resolution, resolved_at: new Date().toISOString() } : b) || [] },
            incidents: state.incidents.map(i => i.id === incidentId ? { ...i, status: 'In Progress' } : i),
          }));
        }
      },

      requestResource: async (incidentId, request) => {
        const { data: ass } = await supabase.from('assignments').select('id').eq('complaint_id', incidentId).single();
        if (!ass) return;
        const { error } = await supabase.from('resource_requests').insert([{ assignment_id: ass.id, ...request }]);
        if (!error) {
          set((state) => ({ resourceRequests: { ...state.resourceRequests, [incidentId]: [...(state.resourceRequests[incidentId] || []), { ...request, id: `REQ-${Date.now()}` }] } }));
        }
      },

      reallocateResources: async (deptId, personnelDelta, vehiclesDelta, equipmentDelta) => {
        set((state) => ({
          resourcePools: {
            ...state.resourcePools,
            [deptId]: {
              ...state.resourcePools[deptId],
              personnel: Math.max(0, (state.resourcePools[deptId]?.personnel || 0) + personnelDelta),
              vehicles: Math.max(0, (state.resourcePools[deptId]?.vehicles || 0) + vehiclesDelta),
              equipment: Math.max(0, (state.resourcePools[deptId]?.equipment || 0) + equipmentDelta),
            },
          }
        }));
      },

      setAIDecision: async (decisionId, incidentId, analysisType, decision) => {
        set((state) => ({
          aiDecisions: { ...state.aiDecisions, [decisionId]: { incidentId, analysisType, decision, timestamp: new Date().toISOString() } },
        }));
      },

      updateUser: async (id, updates) => {
        const { error } = await supabase.from('profiles').update(updates).eq('id', id);
        if (!error) {
          set((state) => ({ users: state.users.map(u => u.id === id ? { ...u, ...updates } : u) }));
        }
      },

      removeCompletionEvidence: async (incidentId, evidenceId) => {
        const { data: ass } = await supabase.from('assignments').select('id').eq('complaint_id', incidentId).single();
        if (!ass) return;
        const { error } = await supabase.from('task_evidence').delete().eq('id', evidenceId);
        if (!error) {
          set((state) => ({
            completionEvidence: { ...state.completionEvidence, [incidentId]: state.completionEvidence[incidentId]?.filter(e => e.id !== evidenceId) || [] }
          }));
        }
      },
    }),
    {
      name: 'mcc-storage',
    }
  )
);
