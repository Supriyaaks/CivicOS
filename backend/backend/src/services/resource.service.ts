import { prisma } from '../utils/prisma';
import { municipalStore } from '../store/municipal.store';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResourceAllocationInput {
  incidentId: string;
  departmentId: string;
  personnel: number;
  vehicles: number;
  equipment: number;
  officerName?: string;
}

export class ResourceService {
  private isUUID(str: string): boolean {
    return UUID_REGEX.test(str);
  }

  async getResourcePools() {
    try {
      const dbPools = await prisma.resourcePool.findMany({
        include: { department: true }
      });

      if (dbPools.length > 0) {
        return dbPools.map(pool => {
          const storeMatch = municipalStore.resourcePools.find(p => p.departmentId === pool.departmentId);
          const assignedP = storeMatch ? storeMatch.assignedPersonnel : Math.floor(pool.personnel * 0.4);
          const assignedV = storeMatch ? storeMatch.assignedVehicles : Math.floor(pool.vehicles * 0.4);
          const assignedE = storeMatch ? storeMatch.assignedEquipment : Math.floor(pool.equipment * 0.4);

          const availPersonnel = Math.max(0, pool.personnel - assignedP);
          const availVehicles = Math.max(0, pool.vehicles - assignedV);
          const availEquipment = Math.max(0, pool.equipment - assignedE);

          const totalCap = pool.personnel + pool.vehicles + pool.equipment;
          const totalAssigned = assignedP + assignedV + assignedE;
          const utilizationRate = totalCap > 0 ? Math.round((totalAssigned / totalCap) * 100) : 0;

          return {
            id: pool.id,
            departmentId: pool.departmentId,
            departmentName: pool.department.name,
            personnel: pool.personnel,
            vehicles: pool.vehicles,
            equipment: pool.equipment,
            assignedPersonnel: assignedP,
            assignedVehicles: assignedV,
            assignedEquipment: assignedE,
            availablePersonnel: availPersonnel,
            availableVehicles: availVehicles,
            availableEquipment: availEquipment,
            utilizationRate,
            status: utilizationRate > 80 ? 'Bottleneck' : utilizationRate > 50 ? 'Optimal' : 'Underutilized',
            updatedAt: pool.updatedAt
          };
        });
      }
    } catch (err: any) {
      console.warn('[ResourceService] Failed to read resource pools from DB, falling back to store:', err.message);
    }

    return municipalStore.resourcePools.map(pool => {
      const availPersonnel = Math.max(0, pool.personnel - pool.assignedPersonnel);
      const availVehicles = Math.max(0, pool.vehicles - pool.assignedVehicles);
      const availEquipment = Math.max(0, pool.equipment - pool.assignedEquipment);

      const totalCap = pool.personnel + pool.vehicles + pool.equipment;
      const totalAssigned = pool.assignedPersonnel + pool.assignedVehicles + pool.assignedEquipment;
      const utilizationRate = totalCap > 0 ? Math.round((totalAssigned / totalCap) * 100) : 0;

      return {
        ...pool,
        availablePersonnel: availPersonnel,
        availableVehicles: availVehicles,
        availableEquipment: availEquipment,
        utilizationRate,
        status: utilizationRate > 80 ? 'Bottleneck' : utilizationRate > 50 ? 'Optimal' : 'Underutilized'
      };
    });
  }

  async allocateResources(data: ResourceAllocationInput) {
    let pool = municipalStore.resourcePools.find(p => p.departmentId === data.departmentId);
    if (!pool) {
      const dept = municipalStore.departments.find(d =>
        d.id === data.departmentId ||
        d.code.toLowerCase() === data.departmentId.toLowerCase() ||
        d.name.toLowerCase() === data.departmentId.toLowerCase()
      );
      if (dept) pool = municipalStore.resourcePools.find(p => p.departmentId === dept.id);
    }

    if (!pool) {
      const err = new Error('Department resource pool not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const availPersonnel = pool.personnel - pool.assignedPersonnel;
    const availVehicles = pool.vehicles - pool.assignedVehicles;
    const availEquipment = pool.equipment - pool.assignedEquipment;

    if (data.personnel > availPersonnel || data.vehicles > availVehicles || data.equipment > availEquipment) {
      const err = new Error(`Requested allocation exceeds available capacity (Avail: ${availPersonnel} staff, ${availVehicles} vehicles, ${availEquipment} equipment)`);
      (err as any).statusCode = 400;
      throw err;
    }

    pool.assignedPersonnel += data.personnel;
    pool.assignedVehicles += data.vehicles;
    pool.assignedEquipment += data.equipment;
    pool.updatedAt = new Date();

    // Persist to PostgreSQL
    try {
      if (this.isUUID(data.incidentId)) {
        const officerUser = await prisma.user.findFirst({ where: { role: 'OFFICER' } });
        await prisma.taskTimeline.create({
          data: {
            incidentId: data.incidentId,
            userId: officerUser ? officerUser.id : 'a1000000-0000-0000-0000-000000000001',
            action: 'Resources Allocated',
            note: `Dispatched ${data.personnel} personnel, ${data.vehicles} vehicles, ${data.equipment} specialized equipment units.`,
          }
        });
      }
    } catch {}

    // Add timeline record in store
    municipalStore.taskTimelines.push({
      id: `f-${Date.now()}`,
      incidentId: data.incidentId,
      userId: 'officer',
      userName: data.officerName || 'Resource Dispatcher',
      action: 'Resources Allocated',
      note: `Dispatched ${data.personnel} personnel, ${data.vehicles} vehicles, ${data.equipment} specialized equipment units.`,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Resources allocated successfully',
      pool,
      allocation: {
        incidentId: data.incidentId,
        personnel: data.personnel,
        vehicles: data.vehicles,
        equipment: data.equipment
      }
    };
  }

  async releaseResources(data: ResourceAllocationInput) {
    let pool = municipalStore.resourcePools.find(p => p.departmentId === data.departmentId);
    if (!pool) {
      const dept = municipalStore.departments.find(d =>
        d.id === data.departmentId ||
        d.code.toLowerCase() === data.departmentId.toLowerCase() ||
        d.name.toLowerCase() === data.departmentId.toLowerCase()
      );
      if (dept) pool = municipalStore.resourcePools.find(p => p.departmentId === dept.id);
    }

    if (!pool) {
      const err = new Error('Department resource pool not found');
      (err as any).statusCode = 404;
      throw err;
    }

    pool.assignedPersonnel = Math.max(0, pool.assignedPersonnel - data.personnel);
    pool.assignedVehicles = Math.max(0, pool.assignedVehicles - data.vehicles);
    pool.assignedEquipment = Math.max(0, pool.assignedEquipment - data.equipment);
    pool.updatedAt = new Date();

    // Persist to PostgreSQL
    try {
      if (this.isUUID(data.incidentId)) {
        const officerUser = await prisma.user.findFirst({ where: { role: 'OFFICER' } });
        await prisma.taskTimeline.create({
          data: {
            incidentId: data.incidentId,
            userId: officerUser ? officerUser.id : 'a1000000-0000-0000-0000-000000000001',
            action: 'Resources Released',
            note: `Released ${data.personnel} personnel, ${data.vehicles} vehicles, ${data.equipment} equipment back to central pool.`,
          }
        });
      }
    } catch {}

    municipalStore.taskTimelines.push({
      id: `f-${Date.now()}`,
      incidentId: data.incidentId,
      userId: 'officer',
      userName: data.officerName || 'Resource Controller',
      action: 'Resources Released',
      note: `Released ${data.personnel} personnel, ${data.vehicles} vehicles, ${data.equipment} equipment back to central pool.`,
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Resources released back to pool',
      pool
    };
  }

  async getRecommendations() {
    const recommendations = [];
    const pools = await this.getResourcePools();

    // Scan unresolved incidents from PostgreSQL or fallback store
    let pendingIncidents: any[] = [];
    try {
      pendingIncidents = await prisma.incident.findMany({
        where: { status: { in: ['Pending', 'InProgress'] } },
        include: { department: true }
      });
    } catch {
      pendingIncidents = municipalStore.incidents.filter(
        i => i.status === 'Pending' || i.status === 'InProgress'
      );
    }

    for (const inc of pendingIncidents) {
      const deptPool = pools.find(p => p.departmentId === inc.departmentId);
      if (!deptPool) continue;

      let recPersonnel = 2;
      let recVehicles = 1;
      let recEquipment = 1;
      let urgency: 'CRITICAL' | 'HIGH' | 'ROUTINE' = 'ROUTINE';
      let justification = '';

      if (inc.severity === 'Critical') {
        recPersonnel = 6;
        recVehicles = 2;
        recEquipment = 3;
        urgency = 'CRITICAL';
        justification = 'Critical severity hazard requiring immediate intervention team and containment barrier.';
      } else if (inc.severity === 'High') {
        recPersonnel = 4;
        recVehicles = 1;
        recEquipment = 2;
        urgency = 'HIGH';
        justification = 'High priority civic impact in active commercial/residential corridor.';
      } else {
        recPersonnel = 2;
        recVehicles = 1;
        recEquipment = 1;
        urgency = 'ROUTINE';
        justification = 'Standard maintenance schedule deployment.';
      }

      const canFulfill =
        deptPool.availablePersonnel >= recPersonnel &&
        deptPool.availableVehicles >= recVehicles &&
        deptPool.availableEquipment >= recEquipment;

      recommendations.push({
        incidentId: inc.id,
        incidentCode: inc.incidentCode,
        category: inc.category,
        location: inc.location,
        ward: inc.ward || (inc.location.match(/Ward\s+\d+/i)?.[0]) || 'Ward 14',
        departmentName: deptPool.departmentName,
        departmentId: deptPool.departmentId,
        urgency,
        recommendedAllocation: {
          personnel: recPersonnel,
          vehicles: recVehicles,
          equipment: recEquipment,
        },
        canFulfill,
        shortageWarning: !canFulfill
          ? `Insufficient local resources. Requires assistance from adjacent wards or inter-agency pool.`
          : null,
        justification
      });
    }

    return recommendations.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, ROUTINE: 2 };
      return order[a.urgency] - order[b.urgency];
    });
  }
}

export const resourceService = new ResourceService();
