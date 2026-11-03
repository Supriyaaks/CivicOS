const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const citizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } }) || await prisma.user.findFirst();
  const roadDept = await prisma.department.findFirst({ where: { name: { contains: 'Road' } } });
  const wasteDept = await prisma.department.findFirst({ where: { name: { contains: 'Waste' } } });
  const waterDept = await prisma.department.findFirst({ where: { name: { contains: 'Water' } } });
  const elecDept = await prisma.department.findFirst({ where: { name: { contains: 'Electric' } } });

  const indiraIncidents = [
    {
      incidentCode: 'INC-INDIRA-101',
      category: 'Roads and Potholes',
      description: 'Deep road fissure and pothole impeding vehicular movement on 100 Feet Road arterial corridor.',
      location: '100 Feet Road, Near 12th Main Junction, Indiranagar, Ward 74',
      latitude: 12.9784,
      longitude: 77.6408,
      status: 'Pending',
      currentStage: 1,
      severity: 'High',
      priority: 'High',
      departmentId: roadDept ? roadDept.id : null,
      citizenId: citizen.id,
    },
    {
      incidentCode: 'INC-INDIRA-102',
      category: 'Garbage and Waste Management',
      description: 'Commercial waste container overflow and roadside garbage accumulation near shopping precinct.',
      location: '5th Cross, Near BDA Complex, Indiranagar, Ward 74',
      latitude: 12.9720,
      longitude: 77.6395,
      status: 'InProgress',
      currentStage: 2,
      severity: 'Medium',
      priority: 'Medium',
      departmentId: wasteDept ? wasteDept.id : null,
      citizenId: citizen.id,
    },
    {
      incidentCode: 'INC-INDIRA-103',
      category: 'Street Lighting',
      description: 'Three consecutive street lamps non-functional, creating a dark pedestrian stretch near metro pillar.',
      location: 'CMH Road, Near Metro Pillar 88, Indiranagar, Ward 74',
      latitude: 12.9782,
      longitude: 77.6380,
      status: 'Pending',
      currentStage: 1,
      severity: 'Low',
      priority: 'Low',
      departmentId: elecDept ? elecDept.id : null,
      citizenId: citizen.id,
    },
    {
      incidentCode: 'INC-INDIRA-104',
      category: 'Water Supply',
      description: 'Potable water distribution pipeline fracture causing clean water runoff along road berm.',
      location: 'Defense Colony, 2nd Main Road, Indiranagar, Ward 74',
      latitude: 12.9750,
      longitude: 77.6445,
      status: 'Resolved',
      currentStage: 3,
      severity: 'Critical',
      priority: 'High',
      resolutionDescription: 'Pipeline flange joint replaced and pressure sealed. Pressure tested to 4.2 bar.',
      resolutionDate: new Date(),
      departmentId: waterDept ? waterDept.id : null,
      citizenId: citizen.id,
    }
  ];

  for (const inc of indiraIncidents) {
    const existing = await prisma.incident.findUnique({ where: { incidentCode: inc.incidentCode } });
    if (!existing) {
      const created = await prisma.incident.create({ data: inc });
      console.log('Created: ' + created.incidentCode + ' (' + created.category + ')');
    } else {
      console.log('Already exists: ' + existing.incidentCode);
    }
  }

  const count = await prisma.incident.count();
  console.log('Total incidents in DB: ' + count);
  await prisma.$disconnect();
}

run();
