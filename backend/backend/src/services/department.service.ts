import { prisma } from '../utils/prisma';
import { municipalStore } from '../store/municipal.store';
import { CreateDepartmentSchema, UpdateDepartmentSchema } from '../types/department.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DepartmentService {
  private isUUID(str: string): boolean {
    return UUID_REGEX.test(str);
  }

  async getPerformance() {
    try {
      const [depts, incidents, pools] = await Promise.all([
        prisma.department.findMany({ orderBy: { name: 'asc' } }),
        prisma.incident.findMany({
          select: { id: true, departmentId: true, status: true, createdAt: true, resolutionDate: true }
        }),
        prisma.resourcePool.findMany(),
      ]);

      const totalCityPending = incidents.filter(i => i.status === 'Pending' || i.status === 'InProgress').length;

      return depts.map(dept => {
        const deptIncidents = incidents.filter(i => i.departmentId === dept.id);
        const pending = deptIncidents.filter(i => i.status === 'Pending' || i.status === 'InProgress');
        const resolved = deptIncidents.filter(i => i.status === 'Resolved' || i.status === 'Closed');
        
        // Overdue: pending for > 24 hours
        const now = Date.now();
        const overdue = pending.filter(i => (now - i.createdAt.getTime()) > 24 * 3600 * 1000).length;

        // Avg resolution time
        const resolvedWithDates = resolved.filter(i => i.resolutionDate && i.createdAt);
        let avgResolutionHours = 20.0;
        if (resolvedWithDates.length > 0) {
          const totalMs = resolvedWithDates.reduce((acc, curr) => acc + (curr.resolutionDate!.getTime() - curr.createdAt.getTime()), 0);
          avgResolutionHours = Math.round((totalMs / resolvedWithDates.length / (1000 * 3600)) * 10) / 10;
        }

        // Workload %
        const workloadPercentage = totalCityPending > 0 ? Math.round((pending.length / totalCityPending) * 100) : 0;

        // Pool utilization
        const pool = pools.find(p => p.departmentId === dept.id);
        let utilizationRate = 60;
        if (pool) {
          const total = pool.personnel + pool.vehicles + pool.equipment;
          const assigned = Math.min(total, deptIncidents.length * 2);
          utilizationRate = total > 0 ? Math.round((assigned / total) * 100) : 0;
        }

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          staffCount: dept.staffCount,
          totalAssigned: deptIncidents.length,
          pendingCount: pending.length,
          resolvedCount: resolved.length,
          overdueCount: overdue,
          avgResolutionHours,
          workloadPercentage,
          utilizationRate,
          workloadStatus: dept.workload,
          performanceGrade: overdue > 1 ? 'Needs Improvement' : pending.length > 3 ? 'Heavy Load' : 'Efficient'
        };
      });

    } catch (err: any) {
      console.warn('[DepartmentService] Reading from municipalStore fallback:', err.message);
      const depts = municipalStore.departments;
      const incidents = municipalStore.incidents;
      const pools = municipalStore.resourcePools;

      const totalCityPending = incidents.filter(i => i.status === 'Pending' || i.status === 'InProgress').length;

      return depts.map(dept => {
        const deptIncidents = incidents.filter(i => i.departmentId === dept.id);
        const pending = deptIncidents.filter(i => i.status === 'Pending' || i.status === 'InProgress');
        const resolved = deptIncidents.filter(i => i.status === 'Resolved' || i.status === 'Closed');
        
        const now = Date.now();
        const overdue = pending.filter(i => (now - i.createdAt.getTime()) > 24 * 3600 * 1000).length;

        const resolvedWithDates = resolved.filter(i => i.resolutionDate && i.createdAt);
        let avgResolutionHours = 20.0;
        if (resolvedWithDates.length > 0) {
          const totalMs = resolvedWithDates.reduce((acc, curr) => acc + (curr.resolutionDate!.getTime() - curr.createdAt.getTime()), 0);
          avgResolutionHours = Math.round((totalMs / resolvedWithDates.length / (1000 * 3600)) * 10) / 10;
        }

        const workloadPercentage = totalCityPending > 0 ? Math.round((pending.length / totalCityPending) * 100) : 0;

        const pool = pools.find(p => p.departmentId === dept.id);
        let utilizationRate = 65;
        if (pool) {
          const total = pool.personnel + pool.vehicles + pool.equipment;
          const used = pool.assignedPersonnel + pool.assignedVehicles + pool.assignedEquipment;
          utilizationRate = total > 0 ? Math.round((used / total) * 100) : 0;
        }

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          staffCount: dept.staffCount,
          totalAssigned: deptIncidents.length,
          pendingCount: pending.length,
          resolvedCount: resolved.length,
          overdueCount: overdue,
          avgResolutionHours,
          workloadPercentage,
          utilizationRate,
          workloadStatus: dept.workload,
          performanceGrade: overdue > 1 ? 'Needs Improvement' : pending.length > 3 ? 'Heavy Load' : 'Efficient'
        };
      });
    }
  }

  async createDepartment(data: unknown) {
    const validatedData = CreateDepartmentSchema.parse(data);
    try {
      const created = await prisma.department.create({
        data: validatedData,
      });
      municipalStore.departments.push(created as any);
      return created;
    } catch (error: any) {
      if (error.code === 'P2002') {
        const err = new Error('Department code already exists');
        (err as any).statusCode = 409;
        throw err;
      }
      throw error;
    }
  }

  async getAllDepartments() {
    try {
      return await prisma.department.findMany({
        orderBy: { name: 'asc' },
      });
    } catch {
      return municipalStore.departments;
    }
  }

  async getDepartmentById(idOrCode: string) {
    try {
      let department = null;
      if (this.isUUID(idOrCode)) {
        department = await prisma.department.findUnique({
          where: { id: idOrCode },
        });
      }

      if (!department) {
        department = await prisma.department.findUnique({
          where: { code: idOrCode },
        });
      }

      if (!department) {
        const error = new Error('Department not found');
        (error as any).statusCode = 404;
        throw error;
      }

      return department;
    } catch (err: any) {
      if (err.statusCode === 404) throw err;
      const dept = municipalStore.departments.find(d => d.id === idOrCode || d.code === idOrCode);
      if (!dept) {
        const error = new Error('Department not found');
        (error as any).statusCode = 404;
        throw error;
      }
      return dept;
    }
  }

  async updateDepartment(idOrCode: string, data: unknown) {
    const validatedData = UpdateDepartmentSchema.parse(data);

    try {
      let resolvedId = idOrCode;
      if (!this.isUUID(idOrCode)) {
        const d = await prisma.department.findUnique({ where: { code: idOrCode } });
        if (!d) {
          const err = new Error('Department not found');
          (err as any).statusCode = 404;
          throw err;
        }
        resolvedId = d.id;
      }

      const updated = await prisma.department.update({
        where: { id: resolvedId },
        data: validatedData,
      });

      const storeDept = municipalStore.departments.find(d => d.id === resolvedId || d.code === idOrCode);
      if (storeDept) Object.assign(storeDept, validatedData, { updatedAt: new Date() });

      return updated;
    } catch (error: any) {
      if (error.statusCode === 404) throw error;
      if (error.code === 'P2025') {
        const err = new Error('Department not found');
        (err as any).statusCode = 404;
        throw err;
      }
      if (error.code === 'P2002') {
        const err = new Error('Department code already exists');
        (err as any).statusCode = 409;
        throw err;
      }
      const dept = municipalStore.departments.find(d => d.id === idOrCode || d.code === idOrCode);
      if (!dept) {
        const err = new Error('Department not found');
        (err as any).statusCode = 404;
        throw err;
      }
      Object.assign(dept, validatedData, { updatedAt: new Date() });
      return dept;
    }
  }

  async deleteDepartment(id: string) {
    if (!this.isUUID(id)) {
      const d = await prisma.department.findUnique({ where: { code: id } });
      if (!d) {
        const err = new Error('Department not found');
        (err as any).statusCode = 404;
        throw err;
      }
      id = d.id;
    }

    const [users, incidents, resourcePools] = await Promise.all([
      prisma.user.count({ where: { departmentId: id } }),
      prisma.incident.count({ where: { departmentId: id } }),
      prisma.resourcePool.count({ where: { departmentId: id } }),
    ]);

    if (users > 0 || incidents > 0 || resourcePools > 0) {
      const error = new Error('Cannot delete department while related records exist (Users, Incidents, or Resource Pools)');
      (error as any).statusCode = 409;
      throw error;
    }

    try {
      return await prisma.department.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        const err = new Error('Department not found');
        (err as any).statusCode = 404;
        throw err;
      }
      throw error;
    }
  }
}

export const departmentService = new DepartmentService();
