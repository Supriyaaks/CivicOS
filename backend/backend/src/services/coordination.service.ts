import { prisma } from '../utils/prisma';
import { municipalStore, CrossDeptRequestRecord } from '../store/municipal.store';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CoordinationService {
  private isUUID(str: string): boolean {
    return UUID_REGEX.test(str);
  }

  async getAllRequests(filters?: { status?: string; incidentId?: string; deptId?: string }) {
    try {
      const where: any = {};
      if (filters?.status) where.status = filters.status;
      if (filters?.incidentId) {
        if (this.isUUID(filters.incidentId)) {
          where.incidentId = filters.incidentId;
        } else {
          const inc = await prisma.incident.findUnique({ where: { incidentCode: filters.incidentId }, select: { id: true } });
          if (inc) where.incidentId = inc.id;
        }
      }
      if (filters?.deptId) {
        where.OR = [{ fromDeptId: filters.deptId }, { toDeptId: filters.deptId }];
      }

      const dbRequests = await prisma.crossDepartmentRequest.findMany({
        where,
        include: {
          incident: {
            select: {
              id: true,
              incidentCode: true,
              category: true,
              description: true,
              location: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const depts = await prisma.department.findMany();
      const deptMap = new Map(depts.map(d => [d.id, d.name]));

      return dbRequests.map(r => {
        const storeMatch = municipalStore.crossDeptRequests.find(sr => sr.id === r.id);
        return {
          id: r.id,
          incidentId: r.incidentId,
          incidentCode: r.incident?.incidentCode || 'INC',
          fromDeptId: r.fromDeptId,
          toDeptId: r.toDeptId,
          fromDeptName: deptMap.get(r.fromDeptId) || 'Department',
          toDeptName: deptMap.get(r.toDeptId) || 'Target Department',
          reason: storeMatch ? storeMatch.reason : 'Inter-agency coordination assistance requested',
          status: r.status as any,
          createdAt: r.createdAt,
          updatedAt: r.createdAt,
          comments: storeMatch ? storeMatch.comments : [],
        };
      });

    } catch (err: any) {
      console.warn('[CoordinationService] Fallback to municipalStore for requests:', err.message);
      let requests = [...municipalStore.crossDeptRequests];

      if (filters?.status) {
        requests = requests.filter(r => r.status.toLowerCase() === filters.status?.toLowerCase());
      }
      if (filters?.incidentId) {
        requests = requests.filter(r => r.incidentId === filters.incidentId);
      }
      if (filters?.deptId) {
        requests = requests.filter(r => r.fromDeptId === filters.deptId || r.toDeptId === filters.deptId);
      }

      return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }

  async createRequest(data: {
    incidentId: string;
    fromDeptId: string;
    toDeptId: string;
    reason: string;
    officerName?: string;
  }) {
    let resolvedIncident: any = null;
    let fromDept: any = null;
    let toDept: any = null;

    try {
      resolvedIncident = this.isUUID(data.incidentId)
        ? await prisma.incident.findUnique({ where: { id: data.incidentId } })
        : await prisma.incident.findUnique({ where: { incidentCode: data.incidentId } });

      if (!resolvedIncident) {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }

      fromDept = this.isUUID(data.fromDeptId)
        ? await prisma.department.findUnique({ where: { id: data.fromDeptId } })
        : await prisma.department.findFirst({
            where: {
              OR: [
                { code: data.fromDeptId },
                { name: data.fromDeptId },
                { name: { contains: data.fromDeptId, mode: 'insensitive' } }
              ]
            }
          });

      toDept = this.isUUID(data.toDeptId)
        ? await prisma.department.findUnique({ where: { id: data.toDeptId } })
        : await prisma.department.findFirst({
            where: {
              OR: [
                { code: data.toDeptId },
                { name: data.toDeptId },
                { name: { contains: data.toDeptId, mode: 'insensitive' } }
              ]
            }
          });

      if (!fromDept || !toDept) {
        const err = new Error('One or both departments not found');
        (err as any).statusCode = 404;
        throw err;
      }

      // Persist in PostgreSQL
      const dbRequest = await prisma.crossDepartmentRequest.create({
        data: {
          incidentId: resolvedIncident.id,
          fromDeptId: fromDept.id,
          toDeptId: toDept.id,
          status: 'Pending',
        }
      });

      // Add timeline in PostgreSQL
      const officerUser = await prisma.user.findFirst({ where: { role: 'OFFICER' } });
      await prisma.taskTimeline.create({
        data: {
          incidentId: resolvedIncident.id,
          userId: officerUser ? officerUser.id : resolvedIncident.citizenId,
          action: 'Inter-Agency Coordination Requested',
          note: `Requested support from ${toDept.name}. Purpose: ${data.reason}`,
        }
      }).catch(() => {});

      // Mirror to municipalStore
      const newRequest: CrossDeptRequestRecord = {
        id: dbRequest.id,
        incidentId: resolvedIncident.id,
        fromDeptId: fromDept.id,
        toDeptId: toDept.id,
        fromDeptName: fromDept.name,
        toDeptName: toDept.name,
        reason: data.reason,
        status: 'Pending',
        createdAt: dbRequest.createdAt,
        updatedAt: dbRequest.createdAt,
        comments: [
          {
            id: `cm-${Date.now()}`,
            author: data.officerName || 'Officer',
            department: fromDept.name,
            text: `Coordination requested: ${data.reason}`,
            timestamp: new Date()
          }
        ]
      };
      municipalStore.crossDeptRequests.push(newRequest);

      return newRequest;

    } catch (error: any) {
      if (error.statusCode === 404) throw error;
      // Fallback
      const incident = municipalStore.incidents.find(i => i.id === data.incidentId || i.incidentCode === data.incidentId);
      if (!incident) {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }

      const fDept = municipalStore.departments.find(d => d.id === data.fromDeptId || d.code === data.fromDeptId);
      const tDept = municipalStore.departments.find(d => d.id === data.toDeptId || d.code === data.toDeptId);

      if (!fDept || !tDept) {
        const err = new Error('One or both departments not found');
        (err as any).statusCode = 404;
        throw err;
      }

      const newRequest: CrossDeptRequestRecord = {
        id: `02000000-${Date.now().toString(16).padStart(12, '0')}-000000000001`,
        incidentId: incident.id,
        fromDeptId: fDept.id,
        toDeptId: tDept.id,
        fromDeptName: fDept.name,
        toDeptName: tDept.name,
        reason: data.reason,
        status: 'Pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [
          {
            id: `cm-${Date.now()}`,
            author: data.officerName || 'Officer',
            department: fDept.name,
            text: `Coordination requested: ${data.reason}`,
            timestamp: new Date()
          }
        ]
      };

      municipalStore.crossDeptRequests.push(newRequest);
      return newRequest;
    }
  }

  async updateStatus(id: string, status: 'Pending' | 'Accepted' | 'Rejected' | 'Completed', officerComment?: string, officerName: string = 'Department Officer') {
    try {
      if (this.isUUID(id)) {
        await prisma.crossDepartmentRequest.update({
          where: { id },
          data: { status }
        });
      }
    } catch (err: any) {
      console.warn('[CoordinationService] DB update skipped for request status:', err.message);
    }

    const req = municipalStore.crossDeptRequests.find(r => r.id === id);
    if (req) {
      req.status = status;
      req.updatedAt = new Date();

      if (officerComment) {
        req.comments.push({
          id: `cm-${Date.now()}`,
          author: officerName,
          department: req.toDeptName,
          text: `Status updated to [${status}]: ${officerComment}`,
          timestamp: new Date()
        });
      }

      municipalStore.taskTimelines.push({
        id: `f-${Date.now()}`,
        incidentId: req.incidentId,
        userId: 'officer',
        userName: officerName,
        action: `Cross-Dept Request ${status}`,
        note: `${req.toDeptName} marked request as ${status}.${officerComment ? ` Note: ${officerComment}` : ''}`,
        timestamp: new Date()
      });

      return req;
    }

    return { id, status, updatedAt: new Date() };
  }

  async addComment(id: string, author: string, department: string, text: string) {
    const req = municipalStore.crossDeptRequests.find(r => r.id === id);
    if (!req) {
      const err = new Error('Coordination request not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const comment = {
      id: `cm-${Date.now()}`,
      author: author || 'Department Officer',
      department: department || req.fromDeptName,
      text,
      timestamp: new Date()
    };
    req.comments.push(comment);
    req.updatedAt = new Date();

    return req;
  }
}

export const coordinationService = new CoordinationService();
