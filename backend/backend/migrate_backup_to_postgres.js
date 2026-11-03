const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const crypto = require('crypto');

const prisma = new PrismaClient();
const BACKUP_PATH = 'c:\\Users\\WCT\\Desktop\\DSU\\civicos_incidents_backup_20261103.json';

function stringToUUID(str) {
  // Generate deterministic v5-like UUID from hash
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function migrate() {
  console.log('--- MIGRATING BACKED-UP INCIDENTS TO POSTGRESQL ---');
  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf-8'));
  console.log(`Loaded ${backup.incidents.length} incidents from backup.`);

  const defaultCitizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
  if (!defaultCitizen) throw new Error('No default citizen found in database!');

  let migratedCount = 0;
  let alreadyPresentCount = 0;

  for (const inc of backup.incidents) {
    const code = inc.incidentCode || `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Check if incident already exists by incidentCode
    const existing = await prisma.incident.findUnique({
      where: { incidentCode: code }
    });

    if (existing) {
      console.log(`[SKIP] Incident with code ${code} already in PostgreSQL (id: ${existing.id})`);
      alreadyPresentCount++;
      continue;
    }

    // Determine valid UUID for id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inc.id);
    const targetId = isUUID ? inc.id : stringToUUID(inc.id || code);

    // Validate citizenId
    let citizenId = inc.citizenId;
    if (!citizenId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(citizenId)) {
      citizenId = defaultCitizen.id;
    } else {
      const userExists = await prisma.user.findUnique({ where: { id: citizenId } });
      if (!userExists) citizenId = defaultCitizen.id;
    }

    // Validate departmentId
    let departmentId = inc.departmentId;
    if (departmentId) {
      const deptExists = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!deptExists) departmentId = null;
    }

    const created = await prisma.incident.create({
      data: {
        id: targetId,
        incidentCode: code,
        citizenId: citizenId,
        departmentId: departmentId,
        category: inc.category || 'General',
        description: inc.description || 'Reported incident',
        location: inc.location || 'Municipal Area',
        latitude: inc.latitude != null ? Number(inc.latitude) : null,
        longitude: inc.longitude != null ? Number(inc.longitude) : null,
        status: inc.status || 'Pending',
        currentStage: typeof inc.currentStage === 'number' ? inc.currentStage : 1,
        severity: inc.severity || 'Medium',
        priority: inc.priority || 'Medium',
        createdAt: inc.createdAt ? new Date(inc.createdAt) : new Date(),
        assignmentDate: inc.assignmentDate ? new Date(inc.assignmentDate) : null,
        resolutionDate: inc.resolutionDate ? new Date(inc.resolutionDate) : null,
        resolutionDescription: inc.resolutionDescription || null,
        aiConfidence: inc.aiConfidence || null,
        rootCause: inc.rootCause || null,
        impactScore: inc.impactScore || null,
        citizenConfirmed: Boolean(inc.citizenConfirmed)
      }
    });

    console.log(`[MIGRATED] ${code} -> PostgreSQL UUID: ${created.id}, status: ${created.status}`);
    migratedCount++;
  }

  const finalCount = await prisma.incident.count();
  console.log(`\nMigration completed.`);
  console.log(`- Already present: ${alreadyPresentCount}`);
  console.log(`- Newly migrated: ${migratedCount}`);
  console.log(`- Total incidents now in PostgreSQL: ${finalCount}`);

  await prisma.$disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
