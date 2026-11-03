/**
 * CivicOS In-Memory Municipal Store & Prisma Resilience Layer
 * Provides persistent in-memory data when PostgreSQL is offline,
 * and synchronizes with Prisma when PostgreSQL is connected.
 */

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  staffCount: number;
  workload: 'Low' | 'Medium' | 'High' | 'Overloaded';
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentRecord {
  id: string;
  incidentCode: string;
  citizenId: string;
  departmentId: string | null;
  assignedStaffId: string | null;
  category: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  status: 'Pending' | 'InProgress' | 'Resolved' | 'Closed';
  currentStage: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  ward?: string;
  createdAt: Date;
  assignmentDate: Date | null;
  resolutionDate: Date | null;
  resolutionDescription: string | null;
  aiConfidence: string | null;
  rootCause: string | null;
  impactScore: number | null;
  citizenConfirmed: boolean;
  evidenceUrl?: string;
  supportingDepts?: string[];
}

export interface CrossDeptRequestRecord {
  id: string;
  incidentId: string;
  fromDeptId: string;
  toDeptId: string;
  fromDeptName: string;
  toDeptName: string;
  reason: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
  comments: Array<{
    id: string;
    author: string;
    department: string;
    text: string;
    timestamp: Date;
  }>;
}

export interface ResourcePoolRecord {
  id: string;
  departmentId: string;
  departmentName: string;
  personnel: number;
  vehicles: number;
  equipment: number;
  assignedPersonnel: number;
  assignedVehicles: number;
  assignedEquipment: number;
  updatedAt: Date;
}

export interface AssignmentHistoryRecord {
  id: string;
  incidentId: string;
  departmentId: string;
  departmentName: string;
  userId: string;
  userName: string;
  action: 'AUTO_ASSIGNED' | 'MANUAL_OVERRIDE' | 'REASSIGNED' | 'UNASSIGNED';
  reason: string;
  timestamp: Date;
}

export interface TaskTimelineRecord {
  id: string;
  incidentId: string;
  userId: string;
  userName: string;
  action: string;
  note?: string;
  timestamp: Date;
}

export interface EmergencyState {
  isActive: boolean;
  activatedBy: string | null;
  activatedAt: Date | null;
  deactivatedBy: string | null;
  deactivatedAt: Date | null;
  reason: string | null;
  severityLevel: 'LEVEL_1_WARNING' | 'LEVEL_2_ELEVATED' | 'LEVEL_3_CRITICAL';
  history: Array<{
    id: string;
    action: 'ACTIVATED' | 'DEACTIVATED';
    officer: string;
    reason: string;
    timestamp: Date;
  }>;
}

class MunicipalStore {
  departments: DepartmentRecord[] = [
    {
      id: 'd1000000-0000-0000-0000-000000000001',
      name: 'Roads & Infrastructure',
      code: 'ROADS',
      staffCount: 42,
      workload: 'High',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    },
    {
      id: 'd2000000-0000-0000-0000-000000000002',
      name: 'Solid Waste Management',
      code: 'SAN',
      staffCount: 58,
      workload: 'Medium',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    },
    {
      id: 'd3000000-0000-0000-0000-000000000003',
      name: 'Electrical Department',
      code: 'ELEC',
      staffCount: 24,
      workload: 'Low',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    },
    {
      id: 'd4000000-0000-0000-0000-000000000004',
      name: 'Water and Drainage',
      code: 'WATER',
      staffCount: 35,
      workload: 'High',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    },
    {
      id: 'd5000000-0000-0000-0000-000000000005',
      name: 'Parks & Public Spaces',
      code: 'PARKS',
      staffCount: 18,
      workload: 'Low',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    },
    {
      id: 'd6000000-0000-0000-0000-000000000006',
      name: 'Traffic & Public Safety',
      code: 'SAFETY',
      staffCount: 30,
      workload: 'Medium',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    },
  ];

  incidents: IncidentRecord[] = [
    {
      id: 'c1000000-0000-0000-0000-000000000101',
      incidentCode: 'INC-101',
      citizenId: 'a1000000-0000-0000-0000-000000000001',
      departmentId: 'd1000000-0000-0000-0000-000000000001',
      assignedStaffId: 'b1000000-0000-0000-0000-000000000001',
      category: 'Pothole',
      description: 'Severe road surface fissure and pothole impeding arterial traffic lane.',
      location: 'Sector 4, Main Arterial Junction, Ward 14',
      ward: 'Ward 14',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'InProgress',
      currentStage: 2,
      severity: 'Critical',
      priority: 'High',
      createdAt: new Date(Date.now() - 3600000 * 26),
      assignmentDate: new Date(Date.now() - 3600000 * 20),
      resolutionDate: null,
      resolutionDescription: null,
      aiConfidence: '94%',
      rootCause: 'Monsoon runoff and compromised base compaction',
      impactScore: 88,
      citizenConfirmed: false,
      evidenceUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
      supportingDepts: ['Traffic & Public Safety'],
    },
    {
      id: 'c1000000-0000-0000-0000-000000000102',
      incidentCode: 'INC-102',
      citizenId: 'a1000000-0000-0000-0000-000000000002',
      departmentId: 'd2000000-0000-0000-0000-000000000002',
      assignedStaffId: null,
      category: 'Garbage Dump',
      description: 'Overflowing municipal dump container attracting vermin in high footfall commercial street.',
      location: 'Market Road Cross 3, Ward 7',
      ward: 'Ward 7',
      latitude: 12.9815,
      longitude: 77.6048,
      status: 'Pending',
      currentStage: 1,
      severity: 'High',
      priority: 'High',
      createdAt: new Date(Date.now() - 3600000 * 14),
      assignmentDate: null,
      resolutionDate: null,
      resolutionDescription: null,
      aiConfidence: '91%',
      rootCause: 'Missed scheduled bi-weekly compactor run',
      impactScore: 72,
      citizenConfirmed: false,
      evidenceUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600',
      supportingDepts: [],
    },
    {
      id: 'c1000000-0000-0000-0000-000000000103',
      incidentCode: 'INC-103',
      citizenId: 'a1000000-0000-0000-0000-000000000003',
      departmentId: 'd3000000-0000-0000-0000-000000000003',
      assignedStaffId: null,
      category: 'Streetlight',
      description: 'Consecutive four lampposts non-functional creating security hazard near girls school.',
      location: 'South Avenue 9th Block, Ward 14',
      ward: 'Ward 14',
      latitude: 12.962,
      longitude: 77.585,
      status: 'InProgress',
      currentStage: 2,
      severity: 'Medium',
      priority: 'Medium',
      createdAt: new Date(Date.now() - 3600000 * 48),
      assignmentDate: new Date(Date.now() - 3600000 * 40),
      resolutionDate: null,
      resolutionDescription: null,
      aiConfidence: '96%',
      rootCause: 'Substation breaker circuit fault',
      impactScore: 65,
      citizenConfirmed: false,
      evidenceUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=600',
      supportingDepts: [],
    },
    {
      id: 'c1000000-0000-0000-0000-000000000104',
      incidentCode: 'INC-104',
      citizenId: 'a1000000-0000-0000-0000-000000000004',
      departmentId: 'd4000000-0000-0000-0000-000000000004',
      assignedStaffId: 'b1000000-0000-0000-0000-000000000003',
      category: 'Water Leakage',
      description: 'Major potable main rupture submerging pedestrian sidewalk and reducing local pressure.',
      location: 'Central Circle Park Gate, Ward 3',
      ward: 'Ward 3',
      latitude: 12.978,
      longitude: 77.572,
      status: 'Resolved',
      currentStage: 3,
      severity: 'Critical',
      priority: 'High',
      createdAt: new Date(Date.now() - 3600000 * 72),
      assignmentDate: new Date(Date.now() - 3600000 * 70),
      resolutionDate: new Date(Date.now() - 3600000 * 12),
      resolutionDescription: 'Replaced 12m section of ductile iron main pipe with high-pressure sleeve weld.',
      aiConfidence: '98%',
      rootCause: 'Aging cast-iron distribution line under cyclic pressure surge',
      impactScore: 92,
      citizenConfirmed: true,
      evidenceUrl: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=600',
      supportingDepts: ['Roads & Infrastructure'],
    },
    {
      id: 'c1000000-0000-0000-0000-000000000105',
      incidentCode: 'INC-105',
      citizenId: 'a1000000-0000-0000-0000-000000000005',
      departmentId: null,
      assignedStaffId: null,
      category: 'Fallen Tree & Debris',
      description: 'Large banyan branch snapped during squall, blocking secondary transit corridor.',
      location: 'Greenway Boulevard Ward 14',
      ward: 'Ward 14',
      latitude: 12.969,
      longitude: 77.591,
      status: 'Pending',
      currentStage: 1,
      severity: 'High',
      priority: 'High',
      createdAt: new Date(Date.now() - 3600000 * 3),
      assignmentDate: null,
      resolutionDate: null,
      resolutionDescription: null,
      aiConfidence: '87%',
      rootCause: 'Wind gust damage on decaying branch',
      impactScore: 78,
      citizenConfirmed: false,
      evidenceUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=600',
      supportingDepts: [],
    },
    {
      id: 'c1000000-0000-0000-0000-000000000106',
      incidentCode: 'INC-106',
      citizenId: 'a1000000-0000-0000-0000-000000000006',
      departmentId: 'd1000000-0000-0000-0000-000000000001',
      assignedStaffId: 'b1000000-0000-0000-0000-000000000001',
      category: 'Pothole',
      description: 'Deep road depression near bus stop posing risk to two-wheelers during rain.',
      location: 'Ring Road Pier 18, Ward 7',
      ward: 'Ward 7',
      latitude: 12.985,
      longitude: 77.612,
      status: 'Resolved',
      currentStage: 3,
      severity: 'High',
      priority: 'Medium',
      createdAt: new Date(Date.now() - 3600000 * 96),
      assignmentDate: new Date(Date.now() - 3600000 * 90),
      resolutionDate: new Date(Date.now() - 3600000 * 30),
      resolutionDescription: 'Asphalt hot-mix patched and roller compacted.',
      aiConfidence: '93%',
      rootCause: 'Heavy bus axle load shear',
      impactScore: 70,
      citizenConfirmed: true,
      evidenceUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
      supportingDepts: [],
    },
  ];

  crossDeptRequests: CrossDeptRequestRecord[] = [
    {
      id: '02000000-0000-0000-0000-000000000001',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      fromDeptId: 'd1000000-0000-0000-0000-000000000001',
      toDeptId: 'd6000000-0000-0000-0000-000000000006',
      fromDeptName: 'Roads & Infrastructure',
      toDeptName: 'Traffic & Public Safety',
      reason: 'Traffic diversion and lane barricading required while milling machine operates during peak hours.',
      status: 'Accepted',
      createdAt: new Date(Date.now() - 3600000 * 18),
      updatedAt: new Date(Date.now() - 3600000 * 12),
      comments: [
        {
          id: 'cm1',
          author: 'Insp. R. Verma',
          department: 'Traffic & Public Safety',
          text: 'Traffic marshals allocated for 22:00 to 04:00 night window. Cones placed.',
          timestamp: new Date(Date.now() - 3600000 * 12),
        },
      ],
    },
    {
      id: '02000000-0000-0000-0000-000000000002',
      incidentId: 'c1000000-0000-0000-0000-000000000104',
      fromDeptId: 'd4000000-0000-0000-0000-000000000004',
      toDeptId: 'd1000000-0000-0000-0000-000000000001',
      fromDeptName: 'Water and Drainage',
      toDeptName: 'Roads & Infrastructure',
      reason: 'Trench backfilling and asphalt surface restoration after sub-surface pipeline replacement.',
      status: 'Completed',
      createdAt: new Date(Date.now() - 3600000 * 40),
      updatedAt: new Date(Date.now() - 3600000 * 14),
      comments: [
        {
          id: 'cm2',
          author: 'Eng. K. Rao',
          department: 'Roads & Infrastructure',
          text: 'Bitumen resurfacing completed. Road opened for public transit.',
          timestamp: new Date(Date.now() - 3600000 * 14),
        },
      ],
    },
  ];

  resourcePools: ResourcePoolRecord[] = [
    {
      id: '01000000-0000-0000-0000-000000000001',
      departmentId: 'd1000000-0000-0000-0000-000000000001',
      departmentName: 'Roads & Infrastructure',
      personnel: 42,
      vehicles: 8,
      equipment: 14,
      assignedPersonnel: 28,
      assignedVehicles: 6,
      assignedEquipment: 10,
      updatedAt: new Date(),
    },
    {
      id: '01000000-0000-0000-0000-000000000002',
      departmentId: 'd2000000-0000-0000-0000-000000000002',
      departmentName: 'Solid Waste Management',
      personnel: 58,
      vehicles: 16,
      equipment: 22,
      assignedPersonnel: 34,
      assignedVehicles: 11,
      assignedEquipment: 15,
      updatedAt: new Date(),
    },
    {
      id: '01000000-0000-0000-0000-000000000003',
      departmentId: 'd3000000-0000-0000-0000-000000000003',
      departmentName: 'Electrical Department',
      personnel: 24,
      vehicles: 5,
      equipment: 12,
      assignedPersonnel: 12,
      assignedVehicles: 2,
      assignedEquipment: 5,
      updatedAt: new Date(),
    },
    {
      id: '01000000-0000-0000-0000-000000000004',
      departmentId: 'd4000000-0000-0000-0000-000000000004',
      departmentName: 'Water and Drainage',
      personnel: 35,
      vehicles: 7,
      equipment: 18,
      assignedPersonnel: 25,
      assignedVehicles: 5,
      assignedEquipment: 14,
      updatedAt: new Date(),
    },
    {
      id: '01000000-0000-0000-0000-000000000005',
      departmentId: 'd5000000-0000-0000-0000-000000000005',
      departmentName: 'Parks & Public Spaces',
      personnel: 18,
      vehicles: 3,
      equipment: 8,
      assignedPersonnel: 6,
      assignedVehicles: 1,
      assignedEquipment: 3,
      updatedAt: new Date(),
    },
    {
      id: '01000000-0000-0000-0000-000000000006',
      departmentId: 'd6000000-0000-0000-0000-000000000006',
      departmentName: 'Traffic & Public Safety',
      personnel: 30,
      vehicles: 6,
      equipment: 10,
      assignedPersonnel: 15,
      assignedVehicles: 3,
      assignedEquipment: 6,
      updatedAt: new Date(),
    },
  ];

  assignmentHistory: AssignmentHistoryRecord[] = [
    {
      id: '03000000-0000-0000-0000-000000000001',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      departmentId: 'd1000000-0000-0000-0000-000000000001',
      departmentName: 'Roads & Infrastructure',
      userId: 'system-ai',
      userName: 'CivicOS AI Classifier',
      action: 'AUTO_ASSIGNED',
      reason: 'Rule matched keyword [pothole, road surface] with 94% confidence',
      timestamp: new Date(Date.now() - 3600000 * 20),
    },
    {
      id: '03000000-0000-0000-0000-000000000002',
      incidentId: 'c1000000-0000-0000-0000-000000000103',
      departmentId: 'd3000000-0000-0000-0000-000000000003',
      departmentName: 'Electrical Department',
      userId: 'officer-42',
      userName: 'Chief Officer Sharma',
      action: 'MANUAL_OVERRIDE',
      reason: 'Priority re-routing due to school zone proximity',
      timestamp: new Date(Date.now() - 3600000 * 40),
    },
  ];

  taskTimelines: TaskTimelineRecord[] = [
    {
      id: 'f1000000-0000-0000-0000-000000000001',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      userId: 'a1000000-0000-0000-0000-000000000001',
      userName: 'Citizen Report',
      action: 'Incident Reported',
      note: 'Citizen uploaded geotagged photo showing arterial road pothole.',
      timestamp: new Date(Date.now() - 3600000 * 26),
    },
    {
      id: 'f1000000-0000-0000-0000-000000000002',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      userId: 'b1000000-0000-0000-0000-000000000001',
      userName: 'Auto Assignment Engine',
      action: 'Department Assigned',
      note: 'Assigned to Roads & Infrastructure based on severity and vision analysis.',
      timestamp: new Date(Date.now() - 3600000 * 20),
    },
    {
      id: 'f1000000-0000-0000-0000-000000000003',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      userId: 'b1000000-0000-0000-0000-000000000001',
      userName: 'Officer S. Mehta',
      action: 'Status Updated to InProgress',
      note: 'Field repair team dispatched with cold mix patch vehicle.',
      timestamp: new Date(Date.now() - 3600000 * 18),
    },
  ];

  emergencyState: EmergencyState = {
    isActive: false,
    activatedBy: null,
    activatedAt: null,
    deactivatedBy: null,
    deactivatedAt: null,
    reason: null,
    severityLevel: 'LEVEL_1_WARNING',
    history: [
      {
        id: 'em-log-1',
        action: 'ACTIVATED',
        officer: 'Municipal Commissioner',
        reason: 'Flash rainstorm localized flash-flood alert in Ward 14 and Ward 3.',
        timestamp: new Date(Date.now() - 3600000 * 48),
      },
      {
        id: 'em-log-2',
        action: 'DEACTIVATED',
        officer: 'Municipal Commissioner',
        reason: 'Drain clearing completed and water levels subsided.',
        timestamp: new Date(Date.now() - 3600000 * 24),
      },
    ],
  };
}

export const municipalStore = new MunicipalStore();
