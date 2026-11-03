import { prisma } from '../utils/prisma';
import { municipalStore } from '../store/municipal.store';

export class DashboardService {
  async getStats(filters?: { ward?: string; departmentId?: string; severity?: string; status?: string; dateRange?: string }) {
    try {
      // Query PostgreSQL
      const [total, pending, resolved, critical, highPriority] = await Promise.all([
        prisma.incident.count(),
        prisma.incident.count({ where: { status: { in: ['Pending', 'InProgress'] } } }),
        prisma.incident.count({ where: { status: { in: ['Resolved', 'Closed'] } } }),
        prisma.incident.count({ where: { severity: 'Critical' } }),
        prisma.incident.count({ where: { priority: 'High' } }),
      ]);

      const awaitingAssignment = await prisma.incident.count({
        where: { departmentId: null }
      });

      const underInvestigation = await prisma.incident.count({
        where: { currentStage: 2 }
      });

      const recentIncidents = await prisma.incident.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { department: { select: { name: true, code: true } } }
      });

      // Calculate avg resolution time from resolved records in PostgreSQL
      const resolvedList = await prisma.incident.findMany({
        where: { status: { in: ['Resolved', 'Closed'] }, resolutionDate: { not: null } },
        select: { createdAt: true, resolutionDate: true }
      });

      let avgResolutionTimeHours = 18.4;
      if (resolvedList.length > 0) {
        const totalDurationMs = resolvedList.reduce((acc, curr) => {
          return acc + (curr.resolutionDate!.getTime() - curr.createdAt.getTime());
        }, 0);
        avgResolutionTimeHours = Math.round((totalDurationMs / resolvedList.length / (1000 * 3600)) * 10) / 10;
      }

      return {
        totalIncidents: total,
        pendingComplaints: pending,
        resolvedComplaints: resolved,
        criticalIncidents: critical,
        highPriorityIncidents: highPriority,
        underInvestigation,
        awaitingAssignment,
        avgResolutionTimeHours,
        recentIncidents: recentIncidents.map(i => ({
          ...i,
          department: i.department ? { name: i.department.name, code: i.department.code } : null
        })),
        source: 'database'
      };

    } catch (err: any) {
      console.warn('[DashboardService] Reading stats from municipalStore fallback:', err.message);
      // Graceful fallback to resilient in-memory store
      let list = [...municipalStore.incidents];

      if (filters?.ward) {
        const w = filters.ward;
        list = list.filter(i => i.ward === w || i.location.includes(w));
      }
      if (filters?.departmentId) {
        list = list.filter(i => i.departmentId === filters.departmentId);
      }
      if (filters?.severity) {
        list = list.filter(i => i.severity.toLowerCase() === filters.severity?.toLowerCase());
      }
      if (filters?.status) {
        list = list.filter(i => i.status.toLowerCase() === filters.status?.toLowerCase());
      }

      const total = list.length;
      const pending = list.filter(i => i.status === 'Pending' || i.status === 'InProgress').length;
      const resolved = list.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
      const critical = list.filter(i => i.severity === 'Critical').length;
      const highPriority = list.filter(i => i.priority === 'High' || i.priority === 'Critical').length;
      const underInvestigation = list.filter(i => i.currentStage === 2 || i.status === 'InProgress').length;
      const awaitingAssignment = list.filter(i => !i.departmentId).length;

      const resolvedWithDates = list.filter(i => i.resolutionDate && i.createdAt);
      let avgResolutionTimeHours = 18.5;
      if (resolvedWithDates.length > 0) {
        const totalDurationMs = resolvedWithDates.reduce((acc, curr) => {
          return acc + (curr.resolutionDate!.getTime() - curr.createdAt.getTime());
        }, 0);
        avgResolutionTimeHours = Math.round((totalDurationMs / resolvedWithDates.length / (1000 * 3600)) * 10) / 10;
      }

      const recentIncidents = list
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 6)
        .map(i => {
          const dept = municipalStore.departments.find(d => d.id === i.departmentId);
          return {
            ...i,
            department: dept ? { name: dept.name, code: dept.code } : null
          };
        });

      return {
        totalIncidents: total,
        pendingComplaints: pending,
        resolvedComplaints: resolved,
        criticalIncidents: critical,
        highPriorityIncidents: highPriority,
        underInvestigation,
        awaitingAssignment,
        avgResolutionTimeHours,
        recentIncidents,
        source: 'memory-store'
      };
    }
  }

  async getWorkload() {
    try {
      const depts = await prisma.department.findMany({
        include: {
          _count: {
            select: {
              incidents: {
                where: { status: { in: ['Pending', 'InProgress'] } }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      return depts.map(d => ({
        id: d.id,
        name: d.name,
        code: d.code,
        staffCount: d.staffCount,
        pendingTasks: d._count.incidents,
        workload: d._count.incidents > 3 ? 'High' : d._count.incidents > 1 ? 'Medium' : 'Low'
      }));
    } catch {
      return municipalStore.departments.map(dept => {
        const pendingCount = municipalStore.incidents.filter(
          i => i.departmentId === dept.id && (i.status === 'Pending' || i.status === 'InProgress')
        ).length;
        const totalCount = municipalStore.incidents.filter(i => i.departmentId === dept.id).length;
        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          staffCount: dept.staffCount,
          pendingTasks: pendingCount,
          totalAssigned: totalCount,
          workload: pendingCount > 3 ? 'High' : pendingCount > 1 ? 'Medium' : 'Low'
        };
      });
    }
  }

  async getWards() {
    try {
      const incidents = await prisma.incident.findMany({
        select: { location: true, status: true, severity: true }
      });

      const wardMap: Record<string, { total: number; pending: number; resolved: number; critical: number }> = {};

      incidents.forEach(inc => {
        const wardMatch = inc.location.match(/Ward\s+\d+/i);
        const ward = wardMatch ? wardMatch[0] : 'General Ward';
        if (!wardMap[ward]) {
          wardMap[ward] = { total: 0, pending: 0, resolved: 0, critical: 0 };
        }
        wardMap[ward].total += 1;
        if (inc.status === 'Pending' || inc.status === 'InProgress') wardMap[ward].pending += 1;
        if (inc.status === 'Resolved' || inc.status === 'Closed') wardMap[ward].resolved += 1;
        if (inc.severity === 'Critical') wardMap[ward].critical += 1;
      });

      if (Object.keys(wardMap).length > 0) {
        return Object.entries(wardMap).map(([ward, data]) => ({
          ward,
          ...data,
          riskLevel: data.critical > 0 || data.pending > 2 ? 'High' : data.pending > 0 ? 'Medium' : 'Low'
        }));
      }
    } catch {}

    const incidents = municipalStore.incidents;
    const wardMap: Record<string, { total: number; pending: number; resolved: number; critical: number }> = {};

    incidents.forEach(inc => {
      const ward = inc.ward || (inc.location.match(/Ward\s+\d+/i)?.[0]) || 'General Ward';
      if (!wardMap[ward]) {
        wardMap[ward] = { total: 0, pending: 0, resolved: 0, critical: 0 };
      }
      wardMap[ward].total += 1;
      if (inc.status === 'Pending' || inc.status === 'InProgress') wardMap[ward].pending += 1;
      if (inc.status === 'Resolved' || inc.status === 'Closed') wardMap[ward].resolved += 1;
      if (inc.severity === 'Critical') wardMap[ward].critical += 1;
    });

    return Object.entries(wardMap).map(([ward, data]) => ({
      ward,
      ...data,
      riskLevel: data.critical > 0 || data.pending > 2 ? 'High' : data.pending > 0 ? 'Medium' : 'Low'
    }));
  }
}

export const dashboardService = new DashboardService();
