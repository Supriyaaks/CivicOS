export interface Incident {
  id: string;
  category: string;
  description: string;
  location: string;
  date: string;
  status: string;
  severity: string;
  priority: string;
  assignedDept: string;
  supportingDepts: string[];
  evidence: string;
  aiConfidence: string;
  rootCause: string;
  impactScore: number;
  cascadeRisk: string[];
  ward?: string;
  departmentId?: string;
  locationCoords?: [number, number];
  latitude?: number;
  longitude?: number;
  progress?: number;
  aiVerificationStatus?: string;
  detectedCategory?: string;
  isDuplicate?: boolean;
  aiResults?: any;
  resolutionVerification?: any;
  resolutionDescription?: string;
  resolutionDate?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  staff: number;
  activeIncidents: number;
  workload: string;
  staffCount?: number;
  workloadStatus?: string;
  personnelCount?: number;
}

export interface Cluster {
  id: string;
  incidents: string[];
  category: string;
  area: string;
  confidence: string;
  status: string;
  reason: string;
}

export interface MccUser {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
  contact: string;
}

export interface ResourcePool {
  personnel: number;
  vehicles: number;
  equipment: number;
}

export interface WorkSession {
  sessionId: string;
  incidentId: string;
  startTime: string;
  endTime?: string;
  pauseTime?: string;
  status: 'Active' | 'Paused' | 'Completed';
  duration: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  isCompleted: boolean;
  required: boolean;
  timestamp?: string;
}

export interface Blocker {
  id: string;
  category: 'Material' | 'Permit' | 'Weather' | 'Access' | 'Other';
  description: string;
  resolution?: string;
  resolvedAt?: string;
  reportedAt: string;
}

export interface ResourceRequest {
  id: string;
  item: string;
  quantity: number;
  urgency: 'Low' | 'Medium' | 'High';
  status: 'Requested' | 'Approved' | 'Delivered';
  timestamp: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  category: 'Work' | 'Issue' | 'Material' | 'Observation' | 'General';
  description: string;
}

export interface TaskEvidence {
  id: string;
  url: string;
  category: 'Before Work' | 'During Work' | 'After Work' | 'Additional Inspection' | 'Other';
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  timestamp: string;
  taskId: string;
}

export interface VerificationSubmission {
  submissionId: string;
  taskId: string;
  timestamp: string;
  summary: string;
  evidenceIds: string[];
  checklistState: Record<string, boolean>;
  status: 'Pending' | 'Verified' | 'Rework Required';
  officerFeedback?: {
    note: string;
    requiredCorrections: string[];
    timestamp: string;
  };
}

export interface TaskTimelineEntry {
  timestamp: string;
  action: string;
  user: string;
  note?: string;
  type?: 'SessionStart' | 'SessionEnd' | 'BlockerReported' | 'EvidenceUploaded' | 'StatusChange' | 'General';
}
