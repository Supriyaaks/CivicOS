import { prisma } from '../utils/prisma';
import { municipalStore } from '../store/municipal.store';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AssignmentRule {
  id: string;
  departmentCode: string;
  departmentName: string;
  keywords: string[];
  priority: number;
}

export class AssignmentService {
  private rules: AssignmentRule[] = [
    {
      id: 'rule-roads',
      departmentCode: 'ROADS',
      departmentName: 'Roads & Infrastructure',
      keywords: ['pothole', 'road', 'asphalt', 'pavement', 'traffic signal', 'fissure', 'divider', 'bridge', 'flyover'],
      priority: 1,
    },
    {
      id: 'rule-sanitation',
      departmentCode: 'SAN',
      departmentName: 'Solid Waste Management',
      keywords: ['waste', 'garbage', 'dump', 'trash', 'litter', 'bin', 'debris', 'dead animal', 'compost', 'sweep'],
      priority: 2,
    },
    {
      id: 'rule-electrical',
      departmentCode: 'ELEC',
      departmentName: 'Electrical Department',
      keywords: ['streetlight', 'light', 'lamp', 'cable', 'power', 'electric', 'wire', 'transformer', 'pole', 'spark'],
      priority: 3,
    },
    {
      id: 'rule-water',
      departmentCode: 'WATER',
      departmentName: 'Water and Drainage',
      keywords: ['drainage', 'sewage', 'water', 'leak', 'pipe', 'flood', 'manhole', 'overflow', 'gutter', 'contamination'],
      priority: 4,
    },
    {
      id: 'rule-parks',
      departmentCode: 'PARKS',
      departmentName: 'Parks & Public Spaces',
      keywords: ['tree', 'branch', 'park', 'garden', 'grass', 'lawn', 'bench', 'playground', 'greenway', 'fallen tree'],
      priority: 5,
    },
    {
      id: 'rule-safety',
      departmentCode: 'SAFETY',
      departmentName: 'Traffic & Public Safety',
      keywords: ['barricade', 'hazard', 'traffic jam', 'parking', 'signage', 'accident', 'congestion'],
      priority: 6,
    },
  ];

  private isUUID(str: string): boolean {
    return UUID_REGEX.test(str);
  }

  getRules(): AssignmentRule[] {
    return this.rules;
  }

  classifyIncident(category: string, description: string): { departmentCode: string | null; departmentName: string | null; ruleId: string | null; confidence: number; isUncertain: boolean } {
    const text = `${category || ''} ${description || ''}`.toLowerCase();
    
    let bestMatch: AssignmentRule | null = null;
    let highestScore = 0;

    for (const rule of this.rules) {
      let matches = 0;
      for (const kw of rule.keywords) {
        if (text.includes(kw.toLowerCase())) {
          matches += 1;
        }
      }
      if (matches > highestScore) {
        highestScore = matches;
        bestMatch = rule;
      }
    }

    if (!bestMatch || highestScore === 0) {
      return {
        departmentCode: null,
        departmentName: null,
        ruleId: null,
        confidence: 0,
        isUncertain: true
      };
    }

    const confidence = Math.min(0.98, 0.65 + (highestScore * 0.1));
    return {
      departmentCode: bestMatch.departmentCode,
      departmentName: bestMatch.departmentName,
      ruleId: bestMatch.id,
      confidence,
      isUncertain: false
    };
  }

  async runAutoAssign(incidentId?: string) {
    const results = [];

    // 1. Fetch incidents to process from PostgreSQL (or store)
    let incidentsToProcess: any[] = [];
    try {
      if (incidentId) {
        const found = this.isUUID(incidentId)
          ? await prisma.incident.findUnique({ where: { id: incidentId } })
          : await prisma.incident.findUnique({ where: { incidentCode: incidentId } });
        if (found) incidentsToProcess = [found];
      } else {
        incidentsToProcess = await prisma.incident.findMany({
          where: { departmentId: null }
        });
      }
    } catch {
      // Fallback
      incidentsToProcess = incidentId
        ? municipalStore.incidents.filter(i => i.id === incidentId || i.incidentCode === incidentId)
        : municipalStore.incidents.filter(i => !i.departmentId);
    }

    for (const inc of incidentsToProcess) {
      const classification = this.classifyIncident(inc.category, inc.description);

      if (classification.isUncertain || !classification.departmentCode) {
        results.push({
          incidentId: inc.id,
          incidentCode: inc.incidentCode,
          status: 'NEEDS_MANUAL_REVIEW',
          reason: 'Category and description keywords are ambiguous. Sent to Officer Review Queue.',
          confidence: 'N/A'
        });
        continue;
      }

      // Find department
      let targetDept = null;
      try {
        targetDept = await prisma.department.findUnique({ where: { code: classification.departmentCode } });
      } catch {
        targetDept = municipalStore.departments.find(d => d.code === classification.departmentCode);
      }

      if (!targetDept) {
        results.push({
          incidentId: inc.id,
          incidentCode: inc.incidentCode,
          status: 'NEEDS_MANUAL_REVIEW',
          reason: `Target department ${classification.departmentCode} not found in database.`,
        });
        continue;
      }

      // Persist in PostgreSQL
      try {
        await prisma.incident.update({
          where: { id: inc.id },
          data: {
            departmentId: targetDept.id,
            status: 'InProgress',
            currentStage: 2,
            assignmentDate: new Date()
          }
        });

        const officerUser = await prisma.user.findFirst({ where: { role: 'OFFICER' } });
        const actorId = officerUser ? officerUser.id : inc.citizenId;

        await prisma.assignmentHistory.create({
          data: {
            incidentId: inc.id,
            userId: actorId,
            action: 'AUTO_ASSIGNED',
            timestamp: new Date()
          }
        }).catch(() => {});

        await prisma.taskTimeline.create({
          data: {
            incidentId: inc.id,
            userId: actorId,
            action: 'Department Auto-Assigned',
            note: `Routed to ${targetDept.name} based on AI classification engine.`,
          }
        }).catch(() => {});

      } catch (err: any) {
        console.warn('[AssignmentService] Prisma write skipped in autoAssign:', err.message);
      }

      // Sync in-memory store
      const storeInc = municipalStore.incidents.find(i => i.id === inc.id || i.incidentCode === inc.incidentCode);
      if (storeInc) {
        storeInc.departmentId = targetDept.id;
        storeInc.assignmentDate = new Date();
        if (storeInc.status === 'Pending') storeInc.status = 'InProgress';
        if (storeInc.currentStage === 1) storeInc.currentStage = 2;
      }

      const historyReason = `Matched rule [${classification.ruleId}] with ${Math.round(classification.confidence * 100)}% confidence`;
      municipalStore.assignmentHistory.push({
        id: `03000000-${Date.now().toString(16).padStart(12, '0')}-000000000001`,
        incidentId: inc.id,
        departmentId: targetDept.id,
        departmentName: targetDept.name,
        userId: 'system-ai',
        userName: 'CivicOS Routing Engine',
        action: 'AUTO_ASSIGNED',
        reason: historyReason,
        timestamp: new Date()
      });

      results.push({
        incidentId: inc.id,
        incidentCode: inc.incidentCode,
        status: 'ASSIGNED',
        department: targetDept.name,
        confidence: `${Math.round(classification.confidence * 100)}%`,
        reason: historyReason
      });
    }

    return results;
  }

  async manualOverride(incidentId: string, departmentId: string, reason: string, officerName: string = 'Municipal Officer') {
    let resolvedIncidentId = incidentId;
    let targetDept: any = null;

    try {
      // Resolve incident
      const inc = this.isUUID(incidentId)
        ? await prisma.incident.findUnique({ where: { id: incidentId } })
        : await prisma.incident.findUnique({ where: { incidentCode: incidentId } });

      if (!inc) {
        const error = new Error('Incident not found');
        (error as any).statusCode = 404;
        throw error;
      }
      resolvedIncidentId = inc.id;

      // Resolve department
      targetDept = this.isUUID(departmentId)
        ? await prisma.department.findUnique({ where: { id: departmentId } })
        : await prisma.department.findFirst({
            where: {
              OR: [
                { code: departmentId },
                { name: departmentId },
                { name: { contains: departmentId, mode: 'insensitive' } }
              ]
            }
          });

      if (!targetDept) {
        const error = new Error('Department not found');
        (error as any).statusCode = 404;
        throw error;
      }

      // Update incident
      const updated = await prisma.incident.update({
        where: { id: resolvedIncidentId },
        data: {
          departmentId: targetDept.id,
          status: 'InProgress',
          currentStage: 2,
          assignmentDate: new Date()
        },
        include: { department: true }
      });

      // Audit records
      const officerUser = await prisma.user.findFirst({ where: { role: 'OFFICER' } });
      const actorId = officerUser ? officerUser.id : inc.citizenId;

      await prisma.assignmentHistory.create({
        data: {
          incidentId: resolvedIncidentId,
          userId: actorId,
          action: 'MANUAL_OVERRIDE',
          timestamp: new Date()
        }
      }).catch(() => {});

      await prisma.taskTimeline.create({
        data: {
          incidentId: resolvedIncidentId,
          userId: actorId,
          action: 'Manual Department Override',
          note: `Reassigned to ${targetDept.name}. Reason: ${reason || 'Officer manual reassignment'}`,
        }
      }).catch(() => {});

      // Sync in-memory
      const storeInc = municipalStore.incidents.find(i => i.id === resolvedIncidentId || i.incidentCode === incidentId);
      if (storeInc) {
        storeInc.departmentId = targetDept.id;
        storeInc.assignmentDate = new Date();
        if (storeInc.status === 'Pending') storeInc.status = 'InProgress';
        if (storeInc.currentStage === 1) storeInc.currentStage = 2;
      }

      const historyEntry = {
        id: `03000000-${Date.now().toString(16).padStart(12, '0')}-000000000002`,
        incidentId: resolvedIncidentId,
        departmentId: targetDept.id,
        departmentName: targetDept.name,
        userId: 'officer',
        userName: officerName,
        action: 'MANUAL_OVERRIDE' as const,
        reason: reason || 'Officer manual reassignment',
        timestamp: new Date()
      };
      municipalStore.assignmentHistory.push(historyEntry);

      return {
        success: true,
        incident: updated,
        history: historyEntry
      };

    } catch (error: any) {
      if (error.statusCode === 404) throw error;
      // Fallback
      const storeInc = municipalStore.incidents.find(i => i.id === incidentId || i.incidentCode === incidentId);
      if (!storeInc) {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }
      const dept = municipalStore.departments.find(d => d.id === departmentId || d.code === departmentId);
      if (!dept) {
        const err = new Error('Department not found');
        (err as any).statusCode = 404;
        throw err;
      }

      storeInc.departmentId = dept.id;
      storeInc.assignmentDate = new Date();
      if (storeInc.status === 'Pending') storeInc.status = 'InProgress';
      if (storeInc.currentStage === 1) storeInc.currentStage = 2;

      const historyEntry = {
        id: `03000000-${Date.now().toString(16).padStart(12, '0')}-000000000002`,
        incidentId: storeInc.id,
        departmentId: dept.id,
        departmentName: dept.name,
        userId: 'officer',
        userName: officerName,
        action: 'MANUAL_OVERRIDE' as const,
        reason: reason || 'Officer manual reassignment',
        timestamp: new Date()
      };
      municipalStore.assignmentHistory.push(historyEntry);

      return {
        success: true,
        incident: storeInc,
        history: historyEntry
      };
    }
  }

  async getAssignmentHistory(incidentId: string) {
    try {
      let resolvedId = incidentId;
      if (!this.isUUID(incidentId)) {
        const inc = await prisma.incident.findUnique({ where: { incidentCode: incidentId }, select: { id: true } });
        if (inc) resolvedId = inc.id;
      }

      const history = await prisma.assignmentHistory.findMany({
        where: { incidentId: resolvedId },
        orderBy: { timestamp: 'desc' }
      });

      if (history.length > 0) return history;
    } catch {
      // Handled by store fallback
    }

    const fallback = municipalStore.assignmentHistory.filter(h => h.incidentId === incidentId);
    return fallback.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getUnassignedQueue() {
    try {
      const unassigned = await prisma.incident.findMany({
        where: { departmentId: null },
        include: { citizen: { select: { email: true, profileData: true } } },
        orderBy: { createdAt: 'desc' }
      });

      return unassigned.map(inc => {
        const classification = this.classifyIncident(inc.category, inc.description);
        return {
          ...inc,
          suggestedDept: classification.departmentName,
          suggestedConfidence: classification.confidence > 0 ? `${Math.round(classification.confidence * 100)}%` : null,
          isUncertain: classification.isUncertain
        };
      });
    } catch {
      const unassigned = municipalStore.incidents.filter(i => !i.departmentId);
      return unassigned.map(inc => {
        const classification = this.classifyIncident(inc.category, inc.description);
        return {
          ...inc,
          suggestedDept: classification.departmentName,
          suggestedConfidence: classification.confidence > 0 ? `${Math.round(classification.confidence * 100)}%` : null,
          isUncertain: classification.isUncertain
        };
      });
    }
  }
}

export const assignmentService = new AssignmentService();
