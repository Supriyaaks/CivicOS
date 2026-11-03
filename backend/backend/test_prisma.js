const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.incident.count();
  console.log('TOTAL INCIDENTS IN POSTGRESQL:', total);
  
  const testInc = await prisma.incident.findUnique({
    where: { id: 'c17b0bc0-b5ac-4b35-b6e6-1dc85b9d0ac8' }
  });
  console.log('FOUND NEW INCIDENT IN POSTGRESQL:', JSON.stringify(testInc, null, 2));

  const all = await prisma.incident.findMany({
    select: { id: true, incidentCode: true, category: true, status: true, createdAt: true }
  });
  console.log('\nALL INCIDENTS IN POSTGRESQL:');
  for (const inc of all) {
    console.log(` - ID: ${inc.id} | Code: ${inc.incidentCode} | Cat: ${inc.category} | Status: ${inc.status}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
