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

export interface User {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
  contact: string;
}

export type MccUser = User;

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-1001',
    category: 'Water Supply',
    description: 'Major water main burst causing flooding in residential area.',
    location: 'Sector 4, Maple Avenue',
    date: '2026-10-28T10:30:00Z',
    status: 'In Progress',
    severity: 'Critical',
    priority: 'High',
    assignedDept: 'Water & Sewage Dept',
    supportingDepts: ['Public Works', 'Fire Dept'],
    evidence: 'https://via.placeholder.com/400x300?text=Water+Main+Burst',
    aiConfidence: '94%',
    rootCause: 'Corroded pipe from 1960s installation',
    impactScore: 85,
    cascadeRisk: ['Traffic Disruption', 'Local Business Closure'],
  },
  {
    id: 'INC-1002',
    category: 'Roads and Potholes',
    description: 'Deep pothole causing vehicle damage at major intersection.',
    location: 'North Highway, Exit 12',
    date: '2026-10-29T14:15:00Z',
    status: 'Pending',
    severity: 'Medium',
    priority: 'Medium',
    assignedDept: 'Public Works',
    supportingDepts: [],
    evidence: 'https://via.placeholder.com/400x300?text=Pothole+Image',
    aiConfidence: '88%',
    rootCause: 'Heavy monsoon rainfall and poor drainage',
    impactScore: 45,
    cascadeRisk: ['Minor Traffic Slowdown'],
  },
  {
    id: 'INC-1003',
    category: 'Street Lighting',
    description: 'Complete blackout of street lights for 3 blocks.',
    location: 'Downtown Core, 5th Ave',
    date: '2026-10-30T18:00:00Z',
    status: 'Resolved',
    severity: 'Low',
    priority: 'Low',
    assignedDept: 'Electric Dept',
    supportingDepts: [],
    evidence: 'https://via.placeholder.com/400x300?text=Dark+Street',
    aiConfidence: '91%',
    rootCause: 'Blown transformer due to power surge',
    impactScore: 20,
    cascadeRisk: [],
  },
  {
    id: 'INC-1004',
    category: 'Garbage and Waste Management',
    description: 'Illegal dumping of construction waste in public park.',
    location: 'City Park, East Gate',
    date: '2026-10-31T08:45:00Z',
    status: 'In Progress',
    severity: 'Medium',
    priority: 'Medium',
    assignedDept: 'Waste Management',
    supportingDepts: ['Police'],
    evidence: 'https://via.placeholder.com/400x300?text=Illegal+Dumping',
    aiConfidence: '82%',
    rootCause: 'Lack of surveillance in park periphery',
    impactScore: 30,
    cascadeRisk: ['Environmental Hazard'],
  },
];

export const MOCK_CLUSTERS: Cluster[] = [
  {
    id: 'CLUST-01',
    incidents: ['INC-1001', 'INC-1002'],
    category: 'Infrastructure Failure',
    area: 'Sector 4 & North Highway',
    confidence: '85%',
    status: 'Pending Review',
    reason: 'Common root cause: monsoon damage to underground utilities',
  },
  {
    id: 'CLUST-02',
    incidents: ['INC-1004'],
    category: 'Environmental Violation',
    area: 'City Park',
    confidence: '92%',
    status: 'Confirmed',
    reason: 'Recurrent dumping pattern in same geographic quadrant',
  },
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'DEPT-WATER', name: 'Water & Sewage Dept', code: 'WSD', staff: 45, activeIncidents: 12, workload: 'High' },
  { id: 'DEPT-ROAD', name: 'Public Works', code: 'PWD', staff: 80, activeIncidents: 28, workload: 'Medium' },
  { id: 'DEPT-ELEC', name: 'Electric Dept', code: 'ED', staff: 30, activeIncidents: 5, workload: 'Low' },
  { id: 'DEPT-WASTE', name: 'Waste Management', code: 'WM', staff: 50, activeIncidents: 15, workload: 'Medium' },
];

export const MOCK_USERS: User[] = [
  { id: 'U-01', name: 'Admin User', role: 'Chief Officer', dept: 'Management', status: 'Active', contact: 'admin@city.gov' },
  { id: 'U-02', name: 'Jane Smith', role: 'Dept Head', dept: 'Water & Sewage Dept', status: 'Active', contact: 'jane.smith@city.gov' },
  { id: 'U-03', name: 'Bob Johnson', role: 'Officer', dept: 'Public Works', status: 'Active', contact: 'bob.johnson@city.gov' },
  { id: 'U-04', name: 'Alice Wong', role: 'Officer', dept: 'Waste Management', status: 'Inactive', contact: 'alice.wong@city.gov' },
];
