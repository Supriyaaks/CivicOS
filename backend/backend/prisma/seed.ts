import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Comprehensive CivicOS Database Seeding...');

  // 1. Seed Departments (d1... - valid hex)
  const departments = [
    {
      id: 'd1000000-0000-0000-0000-000000000001',
      name: 'Roads & Infrastructure',
      code: 'ROADS',
      staffCount: 42,
      workload: 'High',
    },
    {
      id: 'd2000000-0000-0000-0000-000000000002',
      name: 'Solid Waste Management',
      code: 'SAN',
      staffCount: 58,
      workload: 'Medium',
    },
    {
      id: 'd3000000-0000-0000-0000-000000000003',
      name: 'Electrical Department',
      code: 'ELEC',
      staffCount: 24,
      workload: 'Low',
    },
    {
      id: 'd4000000-0000-0000-0000-000000000004',
      name: 'Water and Drainage',
      code: 'WATER',
      staffCount: 35,
      workload: 'High',
    },
    {
      id: 'd5000000-0000-0000-0000-000000000005',
      name: 'Parks & Public Spaces',
      code: 'PARKS',
      staffCount: 18,
      workload: 'Low',
    },
    {
      id: 'd6000000-0000-0000-0000-000000000006',
      name: 'Traffic & Public Safety',
      code: 'SAFETY',
      staffCount: 30,
      workload: 'Medium',
    },
    {
      id: 'd7000000-0000-0000-0000-000000000007',
      name: 'Water & Sewage Dept',
      code: 'WSD',
      staffCount: 45,
      workload: 'High',
    },
    {
      id: 'd8000000-0000-0000-0000-000000000008',
      name: 'Public Works',
      code: 'PWD',
      staffCount: 80,
      workload: 'Medium',
    },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {
        name: dept.name,
        staffCount: dept.staffCount,
        workload: dept.workload,
      },
      create: {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        staffCount: dept.staffCount,
        workload: dept.workload,
      },
    });
  }
  console.log(`✅ Seeded ${departments.length} departments.`);

  // 2. Seed Users (a1... for citizens, b1... for officers/staff - valid hex)
  const users = [
    {
      id: 'a1000000-0000-0000-0000-000000000001',
      email: 'jane.doe@example.com',
      passwordHash: 'hashed_pwd_citizen1',
      role: 'CITIZEN' as const,
      profileData: {
        fullName: 'Jane Doe',
        phone: '+91 98450 12345',
        address: '123 Civic Lane, Sector 4',
        city: 'Metropolis',
      },
      departmentId: null,
    },
    {
      id: 'a1000000-0000-0000-0000-000000000002',
      email: 'arjun.rao@civicos.org',
      passwordHash: 'hashed_pwd_citizen2',
      role: 'CITIZEN' as const,
      profileData: {
        fullName: 'Arjun Rao',
        phone: '+91 98450 67890',
        address: 'Market Road Cross 3, Ward 7',
        city: 'Metropolis',
      },
      departmentId: null,
    },
    {
      id: 'a1000000-0000-0000-0000-000000000003',
      email: 'priya.nair@civicos.org',
      passwordHash: 'hashed_pwd_citizen3',
      role: 'CITIZEN' as const,
      profileData: {
        fullName: 'Priya Nair',
        phone: '+91 98450 24680',
        address: 'South Avenue 9th Block, Ward 14',
        city: 'Metropolis',
      },
      departmentId: null,
    },
    {
      id: 'a1000000-0000-0000-0000-000000000004',
      email: 'vikram.singh@civicos.org',
      passwordHash: 'hashed_pwd_citizen4',
      role: 'CITIZEN' as const,
      profileData: {
        fullName: 'Vikram Singh',
        phone: '+91 98450 13579',
        address: 'Central Circle Park Gate, Ward 3',
        city: 'Metropolis',
      },
      departmentId: null,
    },
    {
      id: 'a1000000-0000-0000-0000-000000000005',
      email: 'ananya.gupta@civicos.org',
      passwordHash: 'hashed_pwd_citizen5',
      role: 'CITIZEN' as const,
      profileData: {
        fullName: 'Ananya Gupta',
        phone: '+91 98450 97531',
        address: 'Greenway Boulevard, Ward 14',
        city: 'Metropolis',
      },
      departmentId: null,
    },
    {
      id: 'a1000000-0000-0000-0000-000000000006',
      email: 'kiran.kumar@civicos.org',
      passwordHash: 'hashed_pwd_citizen6',
      role: 'CITIZEN' as const,
      profileData: {
        fullName: 'Kiran Kumar',
        phone: '+91 98450 86420',
        address: 'Ring Road Pier 18, Ward 7',
        city: 'Metropolis',
      },
      departmentId: null,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000001',
      email: 'officer.mehta@city.gov',
      passwordHash: 'hashed_pwd_officer1',
      role: 'OFFICER' as const,
      profileData: {
        fullName: 'Officer S. Mehta',
        contact: 'ext-ROADS-01',
        department: 'Roads & Infrastructure',
      },
      departmentId: 'd1000000-0000-0000-0000-000000000001',
    },
    {
      id: 'b1000000-0000-0000-0000-000000000002',
      email: 'inspector.verma@city.gov',
      passwordHash: 'hashed_pwd_officer2',
      role: 'OFFICER' as const,
      profileData: {
        fullName: 'Insp. R. Verma',
        contact: 'ext-SAFETY-01',
        department: 'Traffic & Public Safety',
      },
      departmentId: 'd6000000-0000-0000-0000-000000000006',
    },
    {
      id: 'b1000000-0000-0000-0000-000000000003',
      email: 'engineer.rao@city.gov',
      passwordHash: 'hashed_pwd_staff1',
      role: 'STAFF' as const,
      profileData: {
        fullName: 'Eng. K. Rao',
        contact: 'ext-WATER-01',
        department: 'Water and Drainage',
      },
      departmentId: 'd4000000-0000-0000-0000-000000000004',
    },
    {
      id: 'b1000000-0000-0000-0000-000000000004',
      email: 'officer.smith@city.gov',
      passwordHash: 'hashed_pwd_smith',
      role: 'OFFICER' as const,
      profileData: {
        fullName: 'Officer Smith',
        contact: 'ext-PWD-01',
        department: 'Public Works',
      },
      departmentId: 'd8000000-0000-0000-0000-000000000008',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        role: user.role,
        profileData: user.profileData,
        departmentId: user.departmentId,
      },
      create: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        profileData: user.profileData,
        departmentId: user.departmentId,
      },
    });
  }
  console.log(`✅ Seeded ${users.length} users.`);

  // 3. Seed Incidents (c1... - valid hex)
  const incidents = [
    {
      id: 'c1000000-0000-0000-0000-000000000101',
      incidentCode: 'INC-101',
      citizenId: 'a1000000-0000-0000-0000-000000000001',
      departmentId: 'd1000000-0000-0000-0000-000000000001',
      assignedStaffId: 'b1000000-0000-0000-0000-000000000001',
      category: 'Pothole',
      description: 'Severe road surface fissure and pothole impeding arterial traffic lane.',
      location: 'Sector 4, Main Arterial Junction, Ward 14',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'InProgress' as const,
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
      latitude: 12.9815,
      longitude: 77.6048,
      status: 'Pending' as const,
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
      latitude: 12.962,
      longitude: 77.585,
      status: 'InProgress' as const,
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
      latitude: 12.978,
      longitude: 77.572,
      status: 'Resolved' as const,
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
      latitude: 12.969,
      longitude: 77.591,
      status: 'Pending' as const,
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
      latitude: 12.985,
      longitude: 77.612,
      status: 'Resolved' as const,
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
    },
    {
      id: 'c1000000-0000-0000-0000-000000000107',
      incidentCode: 'CIV-1001',
      citizenId: 'a1000000-0000-0000-0000-000000000001',
      departmentId: 'd7000000-0000-0000-0000-000000000007',
      assignedStaffId: null,
      category: 'Water Supply',
      description: 'Major water main burst causing flooding in residential area.',
      location: 'Sector 4, Maple Avenue, Ward 4',
      latitude: 12.975,
      longitude: 77.588,
      status: 'InProgress' as const,
      currentStage: 3,
      severity: 'Critical',
      priority: 'High',
      createdAt: new Date(Date.now() - 3600000 * 20),
      assignmentDate: new Date(Date.now() - 3600000 * 18),
      resolutionDate: null,
      resolutionDescription: null,
      aiConfidence: '95%',
      rootCause: 'Mainline high pressure joint breach',
      impactScore: 90,
      citizenConfirmed: false,
    },
  ];

  for (const inc of incidents) {
    await prisma.incident.upsert({
      where: { incidentCode: inc.incidentCode },
      update: {
        category: inc.category,
        description: inc.description,
        location: inc.location,
        latitude: inc.latitude,
        longitude: inc.longitude,
        status: inc.status,
        currentStage: inc.currentStage,
        severity: inc.severity,
        priority: inc.priority,
        departmentId: inc.departmentId,
        assignedStaffId: inc.assignedStaffId,
        assignmentDate: inc.assignmentDate,
        resolutionDate: inc.resolutionDate,
        resolutionDescription: inc.resolutionDescription,
      },
      create: inc,
    });
  }
  console.log(`✅ Seeded ${incidents.length} incidents.`);

  // 4. Seed Evidence (e1... - valid hex)
  const evidences = [
    {
      id: 'e1000000-0000-0000-0000-000000000001',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
      uploadedBy: 'a1000000-0000-0000-0000-000000000001',
      type: 'INITIAL' as const,
      note: 'Citizen uploaded geotagged photo showing arterial road pothole.',
    },
    {
      id: 'e1000000-0000-0000-0000-000000000002',
      incidentId: 'c1000000-0000-0000-0000-000000000102',
      url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600',
      uploadedBy: 'a1000000-0000-0000-0000-000000000002',
      type: 'INITIAL' as const,
      note: 'Overflowing commercial waste bin.',
    },
    {
      id: 'e1000000-0000-0000-0000-000000000003',
      incidentId: 'c1000000-0000-0000-0000-000000000104',
      url: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=600',
      uploadedBy: 'a1000000-0000-0000-0000-000000000004',
      type: 'INITIAL' as const,
      note: 'Water main rupture photo.',
    },
  ];

  for (const ev of evidences) {
    const existing = await prisma.evidence.findUnique({ where: { id: ev.id } });
    if (!existing) {
      await prisma.evidence.create({ data: ev });
    }
  }
  console.log(`✅ Seeded evidence records.`);

  // 5. Seed TaskTimelines (f1... - valid hex)
  const timelines = [
    {
      id: 'f1000000-0000-0000-0000-000000000001',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      userId: 'a1000000-0000-0000-0000-000000000001',
      action: 'Incident Reported',
      note: 'Citizen uploaded geotagged photo showing arterial road pothole.',
      timestamp: new Date(Date.now() - 3600000 * 26),
    },
    {
      id: 'f1000000-0000-0000-0000-000000000002',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      userId: 'b1000000-0000-0000-0000-000000000001',
      action: 'Department Assigned',
      note: 'Assigned to Roads & Infrastructure based on vision analysis.',
      timestamp: new Date(Date.now() - 3600000 * 20),
    },
    {
      id: 'f1000000-0000-0000-0000-000000000003',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      userId: 'b1000000-0000-0000-0000-000000000001',
      action: 'Status Updated to InProgress',
      note: 'Field repair team dispatched with cold mix patch vehicle.',
      timestamp: new Date(Date.now() - 3600000 * 18),
    },
  ];

  for (const t of timelines) {
    const existing = await prisma.taskTimeline.findUnique({ where: { id: t.id } });
    if (!existing) {
      await prisma.taskTimeline.create({ data: t });
    }
  }
  console.log(`✅ Seeded task timeline records.`);

  // 6. Seed Resource Pools (01... - valid hex)
  const pools = [
    {
      id: '01000000-0000-0000-0000-000000000001',
      departmentId: 'd1000000-0000-0000-0000-000000000001',
      personnel: 42,
      vehicles: 8,
      equipment: 14,
    },
    {
      id: '01000000-0000-0000-0000-000000000002',
      departmentId: 'd2000000-0000-0000-0000-000000000002',
      personnel: 58,
      vehicles: 16,
      equipment: 22,
    },
    {
      id: '01000000-0000-0000-0000-000000000003',
      departmentId: 'd3000000-0000-0000-0000-000000000003',
      personnel: 24,
      vehicles: 5,
      equipment: 12,
    },
    {
      id: '01000000-0000-0000-0000-000000000004',
      departmentId: 'd4000000-0000-0000-0000-000000000004',
      personnel: 35,
      vehicles: 7,
      equipment: 18,
    },
    {
      id: '01000000-0000-0000-0000-000000000005',
      departmentId: 'd5000000-0000-0000-0000-000000000005',
      personnel: 18,
      vehicles: 3,
      equipment: 8,
    },
    {
      id: '01000000-0000-0000-0000-000000000006',
      departmentId: 'd6000000-0000-0000-0000-000000000006',
      personnel: 30,
      vehicles: 6,
      equipment: 10,
    },
  ];

  for (const pool of pools) {
    const existing = await prisma.resourcePool.findUnique({ where: { id: pool.id } });
    if (!existing) {
      await prisma.resourcePool.create({ data: pool });
    }
  }
  console.log(`✅ Seeded resource pools.`);

  // 7. Seed Cross Department Requests (02... - valid hex)
  const crossDepts = [
    {
      id: '02000000-0000-0000-0000-000000000001',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      fromDeptId: 'd1000000-0000-0000-0000-000000000001',
      toDeptId: 'd6000000-0000-0000-0000-000000000006',
      status: 'Accepted',
      createdAt: new Date(Date.now() - 3600000 * 18),
    },
    {
      id: '02000000-0000-0000-0000-000000000002',
      incidentId: 'c1000000-0000-0000-0000-000000000104',
      fromDeptId: 'd4000000-0000-0000-0000-000000000004',
      toDeptId: 'd1000000-0000-0000-0000-000000000001',
      status: 'Completed',
      createdAt: new Date(Date.now() - 3600000 * 40),
    },
  ];

  for (const cr of crossDepts) {
    const existing = await prisma.crossDepartmentRequest.findUnique({ where: { id: cr.id } });
    if (!existing) {
      await prisma.crossDepartmentRequest.create({ data: cr });
    }
  }
  console.log(`✅ Seeded cross department requests.`);

  // 8. Seed Assignment History (03... - valid hex)
  const assignments = [
    {
      id: '03000000-0000-0000-0000-000000000001',
      incidentId: 'c1000000-0000-0000-0000-000000000101',
      userId: 'b1000000-0000-0000-0000-000000000001',
      action: 'AUTO_ASSIGNED',
      timestamp: new Date(Date.now() - 3600000 * 20),
    },
    {
      id: '03000000-0000-0000-0000-000000000002',
      incidentId: 'c1000000-0000-0000-0000-000000000103',
      userId: 'b1000000-0000-0000-0000-000000000002',
      action: 'MANUAL_OVERRIDE',
      timestamp: new Date(Date.now() - 3600000 * 40),
    },
  ];

  for (const ah of assignments) {
    const existing = await prisma.assignmentHistory.findUnique({ where: { id: ah.id } });
    if (!existing) {
      await prisma.assignmentHistory.create({ data: ah });
    }
  }
  console.log(`✅ Seeded assignment history.`);

  // 9. Seed Emergency State in SystemSettings
  await prisma.systemSettings.upsert({
    where: { key: 'emergency_state' },
    update: {},
    create: {
      key: 'emergency_state',
      value: {
        isActive: false,
        activatedBy: null,
        activatedAt: null,
        severityLevel: 'LEVEL_1_WARNING',
        reason: null,
      },
    },
  });
  console.log(`✅ Seeded system settings.`);

  console.log('🎉 Comprehensive Database Seeding Finished Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
