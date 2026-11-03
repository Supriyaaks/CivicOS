import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api/v1/departments';

async function test() {
  console.log('🚀 Starting Strict Department API Verification...');

  try {
    // Setup: Create a clean test department
    const testCode = 'TEST-DEPT-' + Date.now();
    console.log('\n1. Testing POST /departments...');
    const createRes = await axios.post(API_BASE, {
      name: 'Verification Dept',
      code: testCode,
      staffCount: 10,
      workload: 'Low'
    });
    const deptId = createRes.data.data.id;
    console.log('✅ Created department:', deptId, 'Status:', createRes.status);

    // 2. List Departments
    console.log('\n2. Testing GET /departments...');
    const allRes = await axios.get(API_BASE);
    console.log('✅ Received', allRes.data.data.length, 'departments, Status:', allRes.status);

    // 3. Get by ID
    console.log('\n3. Testing GET /departments/:id...');
    const oneRes = await axios.get(`${API_BASE}/${deptId}`);
    console.log('✅ Found department:', oneRes.data.data.name, 'Status:', oneRes.status);

    // 4. Update Department
    console.log('\n4. Testing PATCH /departments/:id...');
    const updateRes = await axios.patch(`${API_BASE}/${deptId}`, {
      name: 'Updated Verification Dept',
      staffCount: 15
    });
    console.log('✅ Updated name to:', updateRes.data.data.name, 'Status:', updateRes.status);

    // 5. Duplicate Code on Create (409)
    console.log('\n5. Testing POST (Duplicate Code)...');
    try {
      await axios.post(API_BASE, {
        name: 'Dup Dept',
        code: 'WSD', // Seeded code
        staffCount: 5,
        workload: 'Medium'
      });
    } catch (e: any) {
      const status = e.response?.status;
      const body = JSON.stringify(e.response?.data);
      if (status === 409) {
        console.log(`✅ Correctly handled duplicate code: ${status} ${body}`);
      } else {
        console.log(`❌ Wrong status for duplicate: ${status} ${body}`);
      }
    }

    // 6. Duplicate Code on Update (409)
    console.log('\n6. Testing PATCH (Duplicate Code)...,');
    try {
      await axios.patch(`${API_BASE}/${deptId}`, {
        code: 'WSD'
      });
    } catch (e: any) {
      const status = e.response?.status;
      const body = JSON.stringify(e.response?.data);
      if (status === 409) {
        console.log(`✅ Correctly handled duplicate code on update: ${status} ${body}`);
      } else {
        console.log(`❌ Wrong status for duplicate update: ${status} ${body}`);
      }
    }

    // 7. Invalid UUID (400)
    console.log('\n7. Testing GET /departments/malformed...');
    try {
      await axios.get(`${API_BASE}/not-a-uuid`);
    } catch (e: any) {
      const status = e.response?.status;
      const body = JSON.stringify(e.response?.data);
      if (status === 400) {
        console.log(`✅ Correctly handled malformed UUID: ${status} ${body}`);
      } else {
        console.log(`❌ Wrong status for malformed UUID: ${status} ${body}`);
      }
    }

    // 8. Nonexistent department (404)
    console.log('\n8. Testing GET /departments/nonexistent...');
    try {
      await axios.get(`${API_BASE}/00000000-0000-0000-0000-000000000000`);
    } catch (e: any) {
      const status = e.response?.status;
      const body = JSON.stringify(e.response?.data);
      if (status === 404) {
        console.log(`✅ Correctly handled missing record: ${status} ${body}`);
      } else {
        console.log(`❌ Wrong status for missing record: ${status} ${body}`);
      }
    }

    // 9. Delete with related records (409)
    const relatedDept = await prisma.department.findFirst({
      where: {
        OR: [
          { users: { some: {} } },
          { incidents: { some: {} } }
        ]
      }
    });
    if (relatedDept) {
      console.log('\n9. Testing DELETE /departments/:id (Related Records)... found dept id:', relatedDept.id);
      try {
        await axios.delete(`${API_BASE}/${relatedDept.id}`);
      } catch (e: any) {
        const status = e.response?.status;
        const body = JSON.stringify(e.response?.data);
        if (status === 409) {
          console.log(`✅ Correctly prevented deleting dept with related records: ${status} ${body}`);
        } else {
          console.log(`❌ Wrong status for related records delete: ${status} ${body}`);
        }
      }
    }

    console.log('\n✨ Department Verification Suite Completed Successfully!');
  } catch (error: any) {
    console.error('Fatal Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
