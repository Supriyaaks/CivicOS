import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api/v1/incidents';

async function test() {
  console.log('🚀 Starting Final Incident API Verification...');

  try {
    const citizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
    if (!citizen) throw new Error('No citizen found');

    const tests = [
      {
        name: 'Create Incident',
        op: async () => {
          const res = await axios.post(API_BASE, {
            incidentCode: 'VERIFY-101',
            citizenId: citizen.id,
            category: 'Infrastructure',
            description: 'Final Verification',
            location: 'Verification St'
          });
          return { status: res.status, body: res.data };
        }
      },
      {
        name: 'Get All Incidents',
        op: async () => {
          const res = await axios.get(API_BASE);
          return { status: res.status, body: res.data };
        }
      },
      {
        name: 'Get By ID',
        op: async () => {
          const inc = await prisma.incident.findFirst({ where: { incidentCode: 'VERIFY-101' } });
          if (!inc) throw new Error('Could not find created incident');
          const res = await axios.get(`${API_BASE}/${inc.id}`);
          return { status: res.status, body: res.data };
        }
      },
      {
        name: 'Update Incident',
        op: async () => {
          const inc = await prisma.incident.findFirst({ where: { incidentCode: 'VERIFY-101' } });
          if (!inc) throw new Error('Incident lost');
          const res = await axios.patch(`${API_BASE}/${inc.id}`, { description: 'Verified Description' });
          return { status: res.status, body: res.data };
        }
      },
      {
        name: 'Update Status',
        op: async () => {
          const inc = await prisma.incident.findFirst({ where: { incidentCode: 'VERIFY-101' } });
          if (!inc) throw new Error('Incident lost');
          const res = await axios.patch(`${API_BASE}/${inc.id}/status`, { status: 'InProgress', stage: 3 });
          return { status: res.status, body: res.data };
        }
      },
      {
        name: 'Delete Incident',
        op: async () => {
          const inc = await prisma.incident.findFirst({ where: { incidentCode: 'VERIFY-101' } });
          if (!inc) throw new Error('Incident lost');
          const res = await axios.delete(`${API_BASE}/${inc.id}`);
          return { status: res.status, body: res.data };
        }
      },
      {
        name: 'Invalid UUID',
        op: async () => {
          try {
            await axios.get(`${API_BASE}/not-a-uuid`);
            return { status: 500, body: 'Failed to reject' };
          } catch (e: any) {
            return { status: e.response?.status, body: e.response?.data };
          }
        }
      },
      {
        name: 'Missing Record',
        op: async () => {
          try {
            await axios.get(`${API_BASE}/00000000-0000-0000-0000-000000000000`);
            return { status: 500, body: 'Failed to reject' };
          } catch (e: any) {
            return { status: e.response?.status, body: e.response?.data };
          }
        }
      },
      {
        name: 'Non-existent Citizen',
        op: async () => {
          try {
            await axios.post(API_BASE, {
              incidentCode: 'FAIL-101',
              citizenId: '00000000-0000-0000-0000-000000000000',
              category: 'Roads',
              description: 'Should fail',
              location: 'Nowhere'
            });
            return { status: 500, body: 'Failed to reject' };
          } catch (e: any) {
            return { status: e.response?.status, body: e.response?.data };
          }
        }
      }
    ];

    for (const t of tests) {
      try {
        const result = await t.op();
        console.log(`✅ ${t.name} | Status: ${result.status} | Body: ${JSON.stringify(result.body)}`);
      } catch (e: any) {
        console.log(`❌ ${t.name} | Failed: ${e.message}`);
      }
    }
  } catch (error: any) {
    console.error('Fatal Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
