import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { prisma } from '../utils/prisma';
import { municipalStore } from '../store/municipal.store';
import { CreateIncidentSchema, UpdateIncidentSchema, IncidentFilterSchema } from '../types/incident.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class IncidentService {
  /**
   * Helper: check if string is a valid UUID
   */
  private isUUID(str: string): boolean {
    return UUID_REGEX.test(str);
  }

  /**
   * Helper: safely normalize any status string to Prisma IncidentStatus enum
   */
  public normalizeStatus(status?: string): 'Pending' | 'InProgress' | 'Resolved' | 'Closed' {
    if (!status) return 'Pending';
    const clean = status.replace(/[\s_-]+/g, '').toLowerCase();
    if (clean === 'inprogress' || clean === 'investigating' || clean === 'underreview' || clean === 'assigned' || clean === 'awaitingverification') return 'InProgress';
    if (clean === 'resolved' || clean === 'verified' || clean === 'completed' || clean === 'mitigated') return 'Resolved';
    if (clean === 'closed' || clean === 'rejected') return 'Closed';
    return 'Pending';
  }

  /**
   * Helper: resolve incident UUID from either UUID or incidentCode
   */
  private async resolveIncidentUUID(idOrCode: string): Promise<string | null> {
    try {
      if (this.isUUID(idOrCode)) {
        const inc = await prisma.incident.findUnique({ where: { id: idOrCode }, select: { id: true } });
        if (inc) return inc.id;
      }
      const byCode = await prisma.incident.findUnique({ where: { incidentCode: idOrCode }, select: { id: true } });
      return byCode ? byCode.id : null;
    } catch {
      const inc = municipalStore.incidents.find(i => i.id === idOrCode || i.incidentCode === idOrCode);
      return inc ? inc.id : null;
    }
  }

  /**
   * Create an incident with real PostgreSQL persistence
   */
  async createIncident(data: any) {
    const validatedData = CreateIncidentSchema.parse(data);

    try {
      // 1. Resolve citizen user
      let citizenId = validatedData.citizenId;
      if (citizenId && this.isUUID(citizenId)) {
        const citizen = await prisma.user.findUnique({ where: { id: citizenId } });
        if (!citizen) {
          const error = new Error('Citizen not found');
          (error as any).statusCode = 404;
          throw error;
        }
      } else {
        // Fall back to first citizen in DB or seeded default citizen
        const defaultCitizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
        if (!defaultCitizen) {
          const error = new Error('No registered citizen found to assign complaint to');
          (error as any).statusCode = 404;
          throw error;
        }
        citizenId = defaultCitizen.id;
      }

      // 2. Resolve department ID if provided (by code or UUID)
      let resolvedDeptId: string | null = null;
      if (validatedData.departmentId) {
        if (this.isUUID(validatedData.departmentId)) {
          const dept = await prisma.department.findUnique({ where: { id: validatedData.departmentId } });
          if (dept) resolvedDeptId = dept.id;
        } else {
          const dept = await prisma.department.findUnique({ where: { code: validatedData.departmentId } });
          if (dept) resolvedDeptId = dept.id;
        }
      }

      // 3. Resolve incident code
      let incidentCode = validatedData.incidentCode;
      if (!incidentCode) {
        incidentCode = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Check code collision
      const existingCode = await prisma.incident.findUnique({ where: { incidentCode } });
      if (existingCode) {
        incidentCode = `${incidentCode}-${Math.floor(100 + Math.random() * 900)}`;
      }

      // 4. Parse coordinates
      const lat = validatedData.latitude != null ? Number(validatedData.latitude) : null;
      const lng = validatedData.longitude != null ? Number(validatedData.longitude) : null;

      // 5. Create Incident in PostgreSQL
      const incident = await prisma.incident.create({
        data: {
          incidentCode,
          citizenId: citizenId!,
          departmentId: resolvedDeptId,
          category: validatedData.category,
          description: validatedData.description,
          location: validatedData.location,
          latitude: isNaN(lat as number) ? null : lat,
          longitude: isNaN(lng as number) ? null : lng,
          status: validatedData.status ? this.normalizeStatus(validatedData.status) : 'Pending',
          currentStage: validatedData.currentStage || 1,
          severity: validatedData.severity || 'Medium',
          priority: validatedData.priority || 'Medium',
          aiConfidence: validatedData.aiConfidence || null,
          rootCause: validatedData.rootCause || null,
          impactScore: validatedData.impactScore || null,
        },
        include: {
          citizen: { select: { email: true, profileData: true } },
          department: { select: { id: true, name: true, code: true } },
        }
      });

      // 6. If evidence provided, persist in Evidence table
      if (validatedData.evidenceUrl) {
        await prisma.evidence.create({
          data: {
            incidentId: incident.id,
            url: validatedData.evidenceUrl,
            uploadedBy: citizenId!,
            type: 'INITIAL',
            note: 'Citizen complaint evidence'
          }
        }).catch(() => {});
      }

      // 7. Persist initial TaskTimeline event
      await prisma.taskTimeline.create({
        data: {
          incidentId: incident.id,
          userId: citizenId!,
          action: 'Incident Created',
          note: validatedData.description,
        }
      }).catch(() => {});

      // 8. Mirror to in-memory store for instant sync
      const storeRecord = {
        id: incident.id,
        incidentCode: incident.incidentCode,
        citizenId: incident.citizenId,
        departmentId: incident.departmentId,
        assignedStaffId: incident.assignedStaffId,
        category: incident.category,
        description: incident.description,
        location: incident.location,
        latitude: incident.latitude,
        longitude: incident.longitude,
        status: incident.status as any,
        currentStage: incident.currentStage,
        severity: incident.severity as any,
        priority: incident.priority as any,
        createdAt: incident.createdAt,
        assignmentDate: incident.assignmentDate,
        resolutionDate: incident.resolutionDate,
        resolutionDescription: incident.resolutionDescription,
        aiConfidence: incident.aiConfidence,
        rootCause: incident.rootCause,
        impactScore: incident.impactScore,
        citizenConfirmed: incident.citizenConfirmed,
        evidenceUrl: validatedData.evidenceUrl || undefined,
        supportingDepts: []
      };
      municipalStore.incidents.unshift(storeRecord);

      return {
        ...incident,
        evidenceUrl: validatedData.evidenceUrl,
        evidence: validatedData.evidenceUrl ? [{ url: validatedData.evidenceUrl, type: 'INITIAL', timestamp: incident.createdAt }] : []
      };

    } catch (err: any) {
      if (err.statusCode === 404) throw err;
      console.warn('[IncidentService] PostgreSQL operation failed, utilizing in-memory resilience store:', err.message);

      // In-memory fallback
      const newInc = {
        id: data.id && this.isUUID(data.id) ? data.id : `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        incidentCode: data.incidentCode || data.id || `INC-${Math.floor(100 + Math.random() * 900)}`,
        citizenId: data.citizenId || 'a1000000-0000-0000-0000-000000000001',
        departmentId: data.departmentId || null,
        assignedStaffId: null,
        category: data.category || 'General',
        description: data.description || '',
        location: data.location || 'Central Ward',
        ward: data.ward || 'Ward 14',
        latitude: Number(data.latitude) || 12.9716,
        longitude: Number(data.longitude) || 77.5946,
        status: 'Pending' as const,
        currentStage: 1,
        severity: (data.severity || 'Medium') as any,
        priority: (data.priority || 'Medium') as any,
        createdAt: new Date(),
        assignmentDate: null,
        resolutionDate: null,
        resolutionDescription: null,
        aiConfidence: data.aiConfidence || '90%',
        rootCause: data.rootCause || null,
        impactScore: data.impactScore || 50,
        citizenConfirmed: false,
        evidenceUrl: data.evidenceUrl,
        supportingDepts: []
      };
      municipalStore.incidents.unshift(newInc);
      municipalStore.taskTimelines.push({
        id: `f-${Date.now()}`,
        incidentId: newInc.id,
        userId: newInc.citizenId,
        userName: 'Citizen Report',
        action: 'Incident Created',
        note: newInc.description,
        timestamp: new Date()
      });
      return newInc;
    }
  }

  /**
   * Get all incidents from PostgreSQL with fallback
   */
  async getAllIncidents(filters: any) {
    try {
      const validatedFilters = IncidentFilterSchema.parse(filters || {});
      const where: any = {};

      if (validatedFilters.departmentId) {
        if (this.isUUID(validatedFilters.departmentId)) {
          where.departmentId = validatedFilters.departmentId;
        } else {
          const dept = await prisma.department.findUnique({ where: { code: validatedFilters.departmentId } });
          if (dept) where.departmentId = dept.id;
        }
      }

      if (validatedFilters.status) {
        where.status = validatedFilters.status;
      }

      if (validatedFilters.category) {
        where.category = { equals: validatedFilters.category, mode: 'insensitive' };
      }

      const incidents = await prisma.incident.findMany({
        where,
        include: {
          citizen: { select: { email: true, profileData: true } },
          department: { select: { id: true, name: true, code: true } },
          evidence: true,
          timeline: { orderBy: { timestamp: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return incidents.map(i => ({
        ...i,
        evidenceUrl: i.evidence.length > 0 ? i.evidence[0].url : undefined,
        supportingDepts: []
      }));

    } catch (err: any) {
      console.warn('[IncidentService] Failed to read from PostgreSQL, falling back to municipalStore:', err.message);
      let list = [...municipalStore.incidents];
      if (filters?.departmentId) list = list.filter(i => i.departmentId === filters.departmentId);
      if (filters?.status) list = list.filter(i => i.status === filters.status);
      if (filters?.category) list = list.filter(i => i.category.toLowerCase() === filters.category.toLowerCase());

      return list.map(i => {
        const dept = municipalStore.departments.find(d => d.id === i.departmentId);
        return {
          ...i,
          department: dept ? { id: dept.id, name: dept.name, code: dept.code } : null,
          citizen: { email: 'citizen@civicos.org', profileData: { fullName: 'Verified Citizen' } }
        };
      });
    }
  }

  /**
   * Helper: calculate geographic distance between two coordinates using Haversine formula
   * Returns distance in kilometers (km).
   */
  public calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  /**
   * Helper: format distance for human display
   */
  public formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  }

  /**
   * Helper: determine if incident category matches the requested filter
   */
  private matchesCategory(incidentCategory: string, requestedCategory?: string): boolean {
    if (!requestedCategory || requestedCategory.toLowerCase() === 'all' || requestedCategory.toLowerCase() === 'all categories') {
      return true;
    }
    const inc = (incidentCategory || '').toLowerCase();
    const req = requestedCategory.toLowerCase();

    if (inc === req) return true;

    // Road / Pothole group
    if (req.includes('road') || req.includes('pothole') || req.includes('crack')) {
      return inc.includes('pothole') || inc.includes('road') || inc.includes('crack') || inc.includes('asphalt');
    }
    // Lighting group
    if (req.includes('light') || req.includes('lamp') || req.includes('electric')) {
      return inc.includes('light') || inc.includes('electric') || inc.includes('lamp') || inc.includes('power');
    }
    // Water group
    if (req.includes('water')) {
      return inc.includes('water') || inc.includes('leak') || inc.includes('pipe') || inc.includes('supply');
    }
    // Drainage / Sewage group
    if (req.includes('drain') || req.includes('sewag') || req.includes('sewer') || req.includes('flood')) {
      return inc.includes('drain') || inc.includes('sewag') || inc.includes('sewer') || inc.includes('flood') || inc.includes('overflow');
    }
    // Garbage / Waste group
    if (req.includes('garbag') || req.includes('waste') || req.includes('litter') || req.includes('refuse')) {
      return inc.includes('garbag') || inc.includes('waste') || inc.includes('dump') || inc.includes('container') || inc.includes('litter');
    }
    // Traffic / Safety group
    if (req.includes('traffic') || req.includes('safety') || req.includes('signal')) {
      return inc.includes('traffic') || inc.includes('safety') || inc.includes('signal');
    }
    // Public infrastructure group
    if (req.includes('infra') || req.includes('public')) {
      return inc.includes('infra') || inc.includes('bridge') || inc.includes('flyover') || inc.includes('tree') || inc.includes('pavement');
    }

    return inc.includes(req) || req.includes(inc);
  }

  /**
   * Query incidents near geographic coordinates within radiusKm from PostgreSQL
   */
  async getNearbyIncidents(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    status?: string;
    category?: string;
    limit?: number;
  }) {
    const { latitude, longitude, radiusKm = 5, status, category, limit = 50 } = params;

    try {
      // 1. Fetch all incidents from PostgreSQL with valid coordinates
      const incidents = await prisma.incident.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        include: {
          citizen: { select: { email: true, profileData: true } },
          department: { select: { id: true, name: true, code: true } },
          evidence: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // 2. Filter by status if specified
      let filtered = incidents;
      if (status && status.toLowerCase() !== 'all') {
        const normalizedTarget = this.normalizeStatus(status);
        filtered = filtered.filter(inc => inc.status === normalizedTarget);
      }

      // 3. Filter by category if specified
      if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'all categories') {
        filtered = filtered.filter(inc => this.matchesCategory(inc.category, category));
      }

      // 4. Calculate distance, filter by radius, and attach distance fields
      const withDistance = filtered
        .map(inc => {
          const distanceKm = this.calculateHaversineDistance(
            latitude,
            longitude,
            inc.latitude!,
            inc.longitude!
          );
          return {
            id: inc.id,
            incidentCode: inc.incidentCode,
            title: `${inc.category} - ${inc.location ? inc.location.split(',')[0].trim() : 'Incident'}`,
            category: inc.category,
            description: inc.description,
            location: inc.location,
            latitude: inc.latitude,
            longitude: inc.longitude,
            status: inc.status,
            currentStage: inc.currentStage,
            severity: inc.severity,
            priority: inc.priority,
            createdAt: inc.createdAt,
            distanceKm,
            distanceFormatted: this.formatDistance(distanceKm),
            department: inc.department,
            evidenceUrl: inc.evidence.length > 0 ? inc.evidence[0].url : undefined,
          };
        })
        .filter(inc => inc.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);

      return withDistance;
    } catch (err: any) {
      console.warn('[IncidentService] getNearbyIncidents DB error, falling back to municipalStore:', err.message);

      let filtered = municipalStore.incidents.filter(i => i.latitude !== null && i.longitude !== null);

      if (status && status.toLowerCase() !== 'all') {
        const normalized = this.normalizeStatus(status);
        filtered = filtered.filter(i => (i.status as any) === normalized);
      }

      if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'all categories') {
        filtered = filtered.filter(i => this.matchesCategory(i.category, category));
      }

      return filtered
        .map(inc => {
          const distanceKm = this.calculateHaversineDistance(
            latitude,
            longitude,
            Number(inc.latitude),
            Number(inc.longitude)
          );
          const dept = municipalStore.departments.find(d => d.id === inc.departmentId);
          return {
            id: inc.id,
            incidentCode: inc.incidentCode,
            category: inc.category,
            description: inc.description,
            location: inc.location,
            latitude: inc.latitude,
            longitude: inc.longitude,
            status: inc.status,
            currentStage: inc.currentStage,
            severity: inc.severity,
            priority: inc.priority,
            createdAt: inc.createdAt,
            distanceKm,
            distanceFormatted: this.formatDistance(distanceKm),
            department: dept ? { id: dept.id, name: dept.name, code: dept.code } : null,
            evidenceUrl: inc.evidenceUrl,
          };
        })
        .filter(inc => inc.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, limit);
    }
  }

  /**
   * Get single incident by UUID or incidentCode
   */
  async getIncidentById(idOrCode: string) {
    try {
      let incident = null;

      if (this.isUUID(idOrCode)) {
        incident = await prisma.incident.findUnique({
          where: { id: idOrCode },
          include: {
            citizen: { select: { id: true, email: true, profileData: true } },
            department: true,
            evidence: true,
            timeline: { orderBy: { timestamp: 'asc' } },
          },
        });
      }

      if (!incident) {
        incident = await prisma.incident.findUnique({
          where: { incidentCode: idOrCode },
          include: {
            citizen: { select: { id: true, email: true, profileData: true } },
            department: true,
            evidence: true,
            timeline: { orderBy: { timestamp: 'asc' } },
          },
        });
      }

      if (!incident) {
        const error = new Error('Incident not found');
        (error as any).statusCode = 404;
        throw error;
      }

      return {
        ...incident,
        evidenceUrl: incident.evidence.length > 0 ? incident.evidence[0].url : undefined,
      };

    } catch (err: any) {
      if (err.statusCode === 404) throw err;
      const inc = municipalStore.incidents.find(i => i.id === idOrCode || i.incidentCode === idOrCode);
      if (!inc) {
        const error = new Error('Incident not found');
        (error as any).statusCode = 404;
        throw error;
      }
      const dept = municipalStore.departments.find(d => d.id === inc.departmentId);
      const timelines = municipalStore.taskTimelines.filter(t => t.incidentId === inc.id);
      return {
        ...inc,
        department: dept || null,
        citizen: { email: 'citizen@civicos.org', profileData: { fullName: 'Verified Citizen' } },
        evidence: inc.evidenceUrl ? [{ url: inc.evidenceUrl, type: 'INITIAL', timestamp: inc.createdAt }] : [],
        timeline: timelines
      };
    }
  }

  /**
   * Update incident fields in PostgreSQL
   */
  async updateIncident(idOrCode: string, data: any) {
    const validatedData = UpdateIncidentSchema.parse(data);

    try {
      const resolvedId = await this.resolveIncidentUUID(idOrCode);
      if (!resolvedId) {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }

      const updatePayload: any = { ...validatedData };
      if (updatePayload.status) {
        updatePayload.status = this.normalizeStatus(updatePayload.status);
      }

      const updated = await prisma.incident.update({
        where: { id: resolvedId },
        data: updatePayload,
        include: {
          department: true,
          citizen: { select: { email: true, profileData: true } }
        }
      });

      // Sync to municipalStore
      const inc = municipalStore.incidents.find(i => i.id === resolvedId || i.incidentCode === updated.incidentCode);
      if (inc) Object.assign(inc, validatedData);

      return updated;

    } catch (error: any) {
      if (error.statusCode === 404) throw error;
      if (error.code === 'P2025') {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }
      const inc = municipalStore.incidents.find(i => i.id === idOrCode || i.incidentCode === idOrCode);
      if (!inc) {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }
      Object.assign(inc, validatedData);
      return inc;
    }
  }

  /**
   * Update incident status & stage with timeline audit
   */
  async updateStatus(idOrCode: string, status: string, stage: number, note?: string) {
    // Sync to municipalStore
    const inc = municipalStore.incidents.find(i => i.id === idOrCode || i.incidentCode === idOrCode);
    if (inc) {
      inc.status = status as any;
      inc.currentStage = stage;
      if (status === 'Resolved' || status === 'Closed') {
        inc.resolutionDate = new Date();
        inc.resolutionDescription = note || 'Resolution verified by municipal officer.';
      }
      municipalStore.taskTimelines.push({
        id: `f-${Date.now()}`,
        incidentId: inc.id,
        userId: 'officer',
        userName: 'Municipal Officer',
        action: `Status updated to ${status}`,
        note: note || `Current Stage: ${stage}`,
        timestamp: new Date()
      });
    }

    try {
      const resolvedId = await this.resolveIncidentUUID(idOrCode);
      if (!resolvedId) {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }

      const normStatus = this.normalizeStatus(status);
      const updated = await prisma.incident.update({
        where: { id: resolvedId },
        data: {
          status: normStatus,
          currentStage: stage,
          ...(normStatus === 'Resolved' || normStatus === 'Closed' ? { resolutionDate: new Date(), resolutionDescription: note || 'Resolved by officer.' } : {})
        },
      });

      // Record timeline in database
      const officer = await prisma.user.findFirst({ where: { role: 'OFFICER' } });
      await prisma.taskTimeline.create({
        data: {
          incidentId: resolvedId,
          userId: officer ? officer.id : updated.citizenId,
          action: `Status updated to ${status}`,
          note: note || `Current Stage: ${stage}`,
        }
      }).catch(() => {});

      return updated;

    } catch (error: any) {
      if (error.statusCode === 404) throw error;
      if (error.code === 'P2025') {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }
      if (inc) return inc;
      throw error;
    }
  }

  /**
   * Delete an incident and clean up associated records
   */
  async deleteIncident(idOrCode: string) {
    try {
      const resolvedId = await this.resolveIncidentUUID(idOrCode);
      if (!resolvedId) {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }

      // Safe clean up of dependent records first
      await prisma.$transaction([
        prisma.evidence.deleteMany({ where: { incidentId: resolvedId } }),
        prisma.taskTimeline.deleteMany({ where: { incidentId: resolvedId } }),
        prisma.crossDepartmentRequest.deleteMany({ where: { incidentId: resolvedId } }),
        prisma.assignmentHistory.deleteMany({ where: { incidentId: resolvedId } }),
        prisma.aIInsight.deleteMany({ where: { incidentId: resolvedId } }),
        prisma.notification.deleteMany({ where: { incidentId: resolvedId } }),
        prisma.incident.delete({ where: { id: resolvedId } }),
      ]);

      const idx = municipalStore.incidents.findIndex(i => i.id === resolvedId || i.incidentCode === idOrCode);
      if (idx !== -1) municipalStore.incidents.splice(idx, 1);

      return { success: true };

    } catch (error: any) {
      if (error.statusCode === 404) throw error;
      if (error.code === 'P2025') {
        const err = new Error('Incident not found');
        (err as any).statusCode = 404;
        throw err;
      }
      const idx = municipalStore.incidents.findIndex(i => i.id === idOrCode || i.incidentCode === idOrCode);
      if (idx !== -1) {
        municipalStore.incidents.splice(idx, 1);
        return { success: true };
      }
      throw error;
    }
  }

  /**
   * Attach evidence photograph and metadata to an incident
   */
  async addEvidence(idOrCode: string, evidenceData: { url: string; uploadedBy?: string; type?: 'INITIAL' | 'PROGRESS' | 'RESOLUTION'; note?: string; metadata?: any }) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (!evidenceData.url) {
      const err = new Error('Evidence URL is required');
      (err as any).statusCode = 400;
      throw err;
    }

    let uploaderId = evidenceData.uploadedBy;
    if (!uploaderId || !this.isUUID(uploaderId)) {
      const defaultUser = await prisma.user.findFirst();
      uploaderId = defaultUser ? defaultUser.id : 'a1000000-0000-0000-0000-000000000001';
    }

    let evidenceType: 'INITIAL' | 'PROGRESS' | 'RESOLUTION' = 'INITIAL';
    if (evidenceData.type) {
      const upper = String(evidenceData.type).toUpperCase();
      if (upper === 'PROGRESS' || upper === 'RESOLUTION') {
        evidenceType = upper;
      } else {
        evidenceType = 'INITIAL';
      }
    }

    let metadataObj = evidenceData.metadata;
    if (!metadataObj && (evidenceData as any).fileName) {
      metadataObj = {
        fileName: (evidenceData as any).fileName,
        fileSize: (evidenceData as any).fileSize,
        mimeType: (evidenceData as any).mimeType,
        storageProvider: (evidenceData as any).storageProvider,
        isLocalFallback: (evidenceData as any).isLocalFallback,
      };
    }

    const noteStr = metadataObj
      ? (typeof metadataObj === 'string' ? metadataObj : JSON.stringify(metadataObj))
      : (evidenceData.note || 'Evidence uploaded');

    const ev = await prisma.evidence.create({
      data: {
        incidentId: resolvedId,
        url: evidenceData.url,
        uploadedBy: uploaderId,
        type: evidenceType,
        note: noteStr,
      },
    });

    // Add timeline audit
    await prisma.taskTimeline.create({
      data: {
        incidentId: resolvedId,
        userId: uploaderId,
        action: 'Evidence Uploaded',
        note: `Type: ${evidenceType}. Record ID: ${ev.id}`,
      }
    }).catch(() => {});

    return ev;
  }

  /**
   * Retrieve all evidence associated with an incident
   */
  async getIncidentEvidence(idOrCode: string) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const evidenceList = await prisma.evidence.findMany({
      where: { incidentId: resolvedId },
      orderBy: { timestamp: 'asc' },
    });

    return evidenceList.map(ev => {
      let parsedMeta = null;
      try {
        parsedMeta = ev.note ? JSON.parse(ev.note) : null;
      } catch {}

      return {
        ...ev,
        metadata: parsedMeta,
      };
    });
  }

  /**
   * Probes Supabase Cloud Storage and reports bucket status
   */
  async getStorageStatus() {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://xsdqldwjwtsquxfaqvgu.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_bF20T0J9UZ46fGmiHq2z5w_4VI_QJ5E';
    const bucketName = 'incident-evidence';

    let bucketExists = false;
    let isConnected = false;
    let statusMessage = '';

    try {
      const axios = require('axios');
      const res = await axios.get(`${supabaseUrl}/storage/v1/bucket`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        },
        timeout: 4000
      });

      isConnected = res.status === 200;
      if (Array.isArray(res.data)) {
        bucketExists = res.data.some((b: any) => b.id === bucketName || b.name === bucketName);
      }
      statusMessage = bucketExists ? 'Remote bucket verified & ready' : 'Remote bucket pending SQL migration setup';
    } catch (err: any) {
      isConnected = false;
      statusMessage = `Supabase storage probe error: ${err.message}`;
    }

    return {
      configured: true,
      supabaseUrl,
      bucketName,
      isPrivate: true,
      bucketExists,
      bucketStatus: bucketExists ? 'ready' : isConnected ? 'pending_creation' : 'offline',
      storageProvider: bucketExists
        ? 'Supabase Cloud Storage (Private Bucket Active)'
        : 'Supabase Cloud (Pending Creation) / Resilient Fallback Active',
      fallbackActive: !bucketExists,
      fallbackType: 'Base64 Resilient Local Data URL',
      maxFileSize: '10MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
      setupSqlPath: 'prisma/migrations/supabase_storage_setup.sql',
      statusMessage
    };
  }

  /**
   * Upload an evidence file (base64 or data URL) to permanent server storage
   * and persist the resulting record in PostgreSQL.
   */
  async uploadEvidenceFile(idOrCode: string, payload: {
    fileData?: string;
    fileBase64?: string;
    fileName?: string;
    mimeType?: string;
    category?: string;
    description?: string;
    type?: 'INITIAL' | 'PROGRESS' | 'RESOLUTION';
    uploadedBy?: string;
  }) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const rawData = payload.fileData || payload.fileBase64;
    if (!rawData) {
      const err = new Error('File data is required (base64 data URL)');
      (err as any).statusCode = 400;
      throw err;
    }

    // Parse data URL or raw base64
    let mimeType = payload.mimeType || 'image/jpeg';
    let base64String = rawData;
    const match = rawData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64String = match[2];
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validMimes.includes(mimeType.toLowerCase())) {
      const err = new Error(`Unsupported image format: ${mimeType}. Allowed: JPEG, PNG, WEBP`);
      (err as any).statusCode = 400;
      throw err;
    }

    const buffer = Buffer.from(base64String, 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      const err = new Error('File size exceeds the 10MB limit');
      (err as any).statusCode = 400;
      throw err;
    }

    let ext = '.jpg';
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';

    const safeBaseName = (payload.fileName || 'evidence')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/\.[^/.]+$/, '');
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeBaseName}${ext}`;

    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'evidence');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/evidence/${uniqueFileName}`;

    let evidenceType: 'INITIAL' | 'PROGRESS' | 'RESOLUTION' = 'RESOLUTION';
    const cat = payload.category ? payload.category.toLowerCase() : '';
    if (cat.includes('before') || payload.type === 'INITIAL') {
      evidenceType = 'INITIAL';
    } else if (cat.includes('during') || payload.type === 'PROGRESS') {
      evidenceType = 'PROGRESS';
    } else {
      evidenceType = 'RESOLUTION';
    }

    let uploaderId = payload.uploadedBy;
    if (!uploaderId || !this.isUUID(uploaderId)) {
      const staffUser = await prisma.user.findFirst({ where: { role: 'STAFF' } }) || await prisma.user.findFirst();
      uploaderId = staffUser ? staffUser.id : 'b1000000-0000-0000-0000-000000000003';
    }

    const metadata = {
      category: payload.category || (evidenceType === 'INITIAL' ? 'Before Work' : 'After Work'),
      description: payload.description || '',
      fileName: payload.fileName || uniqueFileName,
      fileSize: buffer.length,
      mimeType,
      storageProvider: 'local_server_storage',
      uploadedAt: new Date().toISOString(),
    };

    const evidence = await prisma.evidence.create({
      data: {
        incidentId: resolvedId,
        url: relativeUrl,
        uploadedBy: uploaderId,
        type: evidenceType,
        note: JSON.stringify(metadata),
      },
    });

    await prisma.taskTimeline.create({
      data: {
        incidentId: resolvedId,
        userId: uploaderId,
        action: 'Evidence Uploaded',
        note: `Saved ${metadata.category} photograph (${metadata.fileName}, ${(buffer.length / 1024).toFixed(1)} KB). Record ID: ${evidence.id}`,
      },
    }).catch(() => {});

    return {
      ...evidence,
      metadata,
    };
  }

  /**
   * Retrieve checklist for an incident from PostgreSQL SystemSettings,
   * seeding defaults if not yet created.
   */
  async getChecklist(idOrCode: string) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const key = `task_checklist:${resolvedId}`;
    const setting = await prisma.systemSettings.findUnique({ where: { key } });
    if (setting && Array.isArray(setting.value) && setting.value.length > 0) {
      return setting.value;
    }

    const inc = await prisma.incident.findUnique({ where: { id: resolvedId } });
    const category = inc?.category?.toLowerCase() || '';

    let defaultItems = [
      { id: 'chk-1', label: 'Safety perimeter & warning signs deployed', required: true, isCompleted: false },
      { id: 'chk-2', label: 'Debris cleared & sub-base compacted', required: true, isCompleted: false },
      { id: 'chk-3', label: 'Hot asphalt / repair material applied and leveled', required: true, isCompleted: false },
      { id: 'chk-4', label: 'Final surface inspection & traffic clearance verified', required: true, isCompleted: false },
    ];

    if (category.includes('waste') || category.includes('garbage')) {
      defaultItems = [
        { id: 'chk-1', label: 'Waste collection & container clearance executed', required: true, isCompleted: false },
        { id: 'chk-2', label: 'Sanitation & disinfectant wash applied', required: true, isCompleted: false },
        { id: 'chk-3', label: 'Surrounding sidewalk cleared of debris', required: true, isCompleted: false },
      ];
    } else if (category.includes('light')) {
      defaultItems = [
        { id: 'chk-1', label: 'Electrical circuit & fixture isolation verified', required: true, isCompleted: false },
        { id: 'chk-2', label: 'Defective luminaire / wiring replaced', required: true, isCompleted: false },
        { id: 'chk-3', label: 'Luminance output and photocell operation tested', required: true, isCompleted: false },
      ];
    }

    await prisma.systemSettings.upsert({
      where: { key },
      update: { value: defaultItems },
      create: { key, value: defaultItems },
    });

    return defaultItems;
  }

  /**
   * Persist checklist state in PostgreSQL SystemSettings and log to TaskTimeline.
   */
  async updateChecklist(idOrCode: string, items: any[], updatedBy?: string) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const key = `task_checklist:${resolvedId}`;
    await prisma.systemSettings.upsert({
      where: { key },
      update: { value: items },
      create: { key, value: items },
    });

    let uploaderId = updatedBy;
    if (!uploaderId || !this.isUUID(uploaderId)) {
      const staffUser = await prisma.user.findFirst({ where: { role: 'STAFF' } });
      uploaderId = staffUser ? staffUser.id : 'b1000000-0000-0000-0000-000000000003';
    }

    const completed = items.filter(i => i.isCompleted).length;
    await prisma.taskTimeline.create({
      data: {
        incidentId: resolvedId,
        userId: uploaderId,
        action: 'Checklist Updated',
        note: `Operational checklist updated: ${completed}/${items.length} items completed.`,
      }
    }).catch(() => {});

    return items;
  }

  /**
   * Retrieve verification submission, work summary, and readiness state from PostgreSQL.
   */
  async getVerification(idOrCode: string) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const key = `verification_submission:${resolvedId}`;
    const setting = await prisma.systemSettings.findUnique({ where: { key } });
    const incident = await prisma.incident.findUnique({
      where: { id: resolvedId },
      include: {
        evidence: true,
        department: true,
        assignedStaff: true,
      }
    });

    const checklist: any = await this.getChecklist(resolvedId);

    const evidenceList = incident?.evidence || [];
    const parsedEvidence = evidenceList.map(ev => {
      let meta = null;
      try { meta = ev.note ? JSON.parse(ev.note) : null; } catch {}
      return { ...ev, metadata: meta };
    });

    const hasBeforePhoto = parsedEvidence.some(e =>
      e.type === 'INITIAL' ||
      (e.metadata?.category && e.metadata.category.toLowerCase().includes('before'))
    );
    const hasAfterPhoto = parsedEvidence.some(e =>
      e.type === 'RESOLUTION' ||
      (e.metadata?.category && e.metadata.category.toLowerCase().includes('after'))
    );

    const mandatoryChecklistItems = checklist.filter((i: any) => i.required);
    const checklistDone = mandatoryChecklistItems.length > 0 && mandatoryChecklistItems.every((i: any) => i.isCompleted);

    const submissionData = setting?.value as any || null;
    const workSummary = submissionData?.summary || incident?.resolutionDescription || '';

    const isTaskCompleted = (incident?.status === 'InProgress' && incident.currentStage >= 3) ||
      submissionData?.status != null ||
      incident?.status === 'Resolved';

    return {
      incidentId: resolvedId,
      incidentCode: incident?.incidentCode,
      status: incident?.status,
      currentStage: incident?.currentStage,
      submission: submissionData,
      workSummary,
      checklist,
      evidence: parsedEvidence,
      readiness: {
        statusCompleted: isTaskCompleted,
        checklistDone,
        hasBeforePhoto,
        hasAfterPhoto,
        hasSummary: workSummary.trim().length > 10,
        evidenceCount: parsedEvidence.length,
        isReady: isTaskCompleted && checklistDone && hasBeforePhoto && hasAfterPhoto && workSummary.trim().length > 10,
      }
    };
  }

  /**
   * Submit completion evidence, work summary, and checklist for officer review.
   * Invokes Person 2 AI repair verification when before/after photos are present.
   */
  async submitVerification(idOrCode: string, data: {
    summary: string;
    materials?: string;
    observations?: string;
    evidenceIds?: string[];
    submittedBy?: string;
  }) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    if (!data.summary || data.summary.trim().length < 10) {
      const err = new Error('A detailed work completion summary (at least 10 characters) is required.');
      (err as any).statusCode = 400;
      throw err;
    }

    let uploaderId = data.submittedBy;
    if (!uploaderId || !this.isUUID(uploaderId)) {
      const staffUser = await prisma.user.findFirst({ where: { role: 'STAFF' } });
      uploaderId = staffUser ? staffUser.id : 'b1000000-0000-0000-0000-000000000003';
    }

    const incident = await prisma.incident.findUnique({
      where: { id: resolvedId },
      include: { evidence: true },
    });

    const evidenceList = incident?.evidence || [];
    const parsedEvidence = evidenceList.map(ev => {
      let meta = null;
      try { meta = ev.note ? JSON.parse(ev.note) : null; } catch {}
      return { ...ev, metadata: meta };
    });

    const beforeEvidence = parsedEvidence.find(e =>
      e.type === 'INITIAL' || (e.metadata?.category && e.metadata.category.toLowerCase().includes('before'))
    );
    const afterEvidence = parsedEvidence.find(e =>
      e.type === 'RESOLUTION' || (e.metadata?.category && e.metadata.category.toLowerCase().includes('after'))
    );

    let aiVerificationResult: any = null;
    if (beforeEvidence && afterEvidence) {
      try {
        let beforeBuffer: Buffer | null = null;
        if (beforeEvidence.url.startsWith('/uploads/')) {
          const absPath = path.resolve(process.cwd(), beforeEvidence.url.replace(/^\//, ''));
          if (fs.existsSync(absPath)) beforeBuffer = fs.readFileSync(absPath);
        } else if (beforeEvidence.url.startsWith('data:')) {
          beforeBuffer = Buffer.from(beforeEvidence.url.split(',')[1], 'base64');
        }

        let afterBuffer: Buffer | null = null;
        if (afterEvidence.url.startsWith('/uploads/')) {
          const absPath = path.resolve(process.cwd(), afterEvidence.url.replace(/^\//, ''));
          if (fs.existsSync(absPath)) afterBuffer = fs.readFileSync(absPath);
        } else if (afterEvidence.url.startsWith('data:')) {
          afterBuffer = Buffer.from(afterEvidence.url.split(',')[1], 'base64');
        }

        if (beforeBuffer && afterBuffer) {
          const fd = new FormData();
          fd.append('report_id', incident?.incidentCode || resolvedId);
          fd.append('before_image', new Blob([new Uint8Array(beforeBuffer)], { type: 'image/jpeg' }), 'before.jpg');
          fd.append('after_image', new Blob([new Uint8Array(afterBuffer)], { type: 'image/jpeg' }), 'after.jpg');
          fd.append('repair_details', JSON.stringify({
            contractor: 'CivicOS Municipal Field Unit',
            materials: data.materials || 'Hot-Mix Asphalt & Bitumen Binder',
            notes: data.summary,
          }));

          const person2Url = process.env.PERSON2_AI_URL || process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';
          const aiRes = await fetch(`${person2Url}/api/reports/road-repair-verify`, {
            method: 'POST',
            body: fd,
            signal: AbortSignal.timeout(8000),
          });

          if (aiRes.ok) {
            const aiData: any = await aiRes.json();
            const verif = aiData.verification || {};
            const isRepaired = verif.status === 'appears_repaired' || verif.status === 'repaired';
            aiVerificationResult = {
              status: isRepaired ? 'verified' : (verif.status || 'needs_manual_review'),
              verdict: verif.status || 'needs_manual_review',
              confidence: verif.confidence != null ? verif.confidence : 0.85,
              statusLabel: verif.status_label || (isRepaired ? 'Appears Repaired' : 'Needs Manual Review'),
              reason: verif.reason || '',
              recommendation: verif.recommendation || '',
              metrics: verif.metrics || null,
              explanation: verif.reason || verif.recommendation || 'AI vision inspection completed',
              timestamp: new Date().toISOString(),
            };
          } else {
            const errText = await aiRes.text().catch(() => '');
            aiVerificationResult = {
              status: 'needs_manual_review',
              verdict: 'needs_manual_review',
              statusLabel: 'Needs Manual Review',
              explanation: `AI microservice returned HTTP ${aiRes.status}: ${errText.slice(0, 100)}`,
              timestamp: new Date().toISOString(),
            };
          }
        }
      } catch (aiErr: any) {
        aiVerificationResult = {
          status: 'needs_manual_review',
          verdict: 'needs_manual_review',
          statusLabel: 'Needs Manual Review',
          explanation: `Automated vision check forwarded for manual officer inspection (${aiErr.message})`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    if (!aiVerificationResult) {
      aiVerificationResult = {
        status: 'manual_review_required',
        verdict: 'needs_manual_review',
        explanation: 'Awaiting manual municipal review (incomplete paired comparison imagery).',
        timestamp: new Date().toISOString(),
      };
    }

    const submissionId = `VERIF-${Date.now()}`;
    const submissionObj = {
      id: submissionId,
      incidentId: resolvedId,
      incidentCode: incident?.incidentCode,
      summary: data.summary,
      materials: data.materials || '',
      observations: data.observations || '',
      evidenceIds: data.evidenceIds || parsedEvidence.map(e => e.id),
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      submittedBy: uploaderId,
      aiVerification: aiVerificationResult,
      officerFeedback: null,
    };

    const key = `verification_submission:${resolvedId}`;
    await prisma.systemSettings.upsert({
      where: { key },
      update: { value: submissionObj },
      create: { key, value: submissionObj },
    });

    await prisma.incident.update({
      where: { id: resolvedId },
      data: {
        currentStage: 3,
        resolutionDescription: data.summary,
      },
    });

    await prisma.taskTimeline.create({
      data: {
        incidentId: resolvedId,
        userId: uploaderId,
        action: 'Repair Submitted for Verification',
        note: `Staff work summary: "${data.summary.slice(0, 100)}...". Awaiting department officer review.`,
      },
    }).catch(() => {});

    if (aiVerificationResult?.status === 'verified') {
      await prisma.taskTimeline.create({
        data: {
          incidentId: resolvedId,
          userId: uploaderId,
          action: 'AI Repair Verification',
          note: `AI Verdict: ${aiVerificationResult.statusLabel} (${Math.round((aiVerificationResult.confidence || 0.85) * 100)}% confidence).`,
        },
      }).catch(() => {});
    }

    return submissionObj;
  }

  /**
   * Officer approves or requests rework on a submitted repair verification.
   * Persists decision in PostgreSQL, updates incident status, and updates timeline.
   */
  async recordOfficerDecision(idOrCode: string, decisionData: {
    decision: 'Approve' | 'Rework' | 'Review';
    note?: string;
    corrections?: string[];
    officerId?: string;
  }) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    let officerId = decisionData.officerId;
    if (!officerId || !this.isUUID(officerId)) {
      const officer = await prisma.user.findFirst({ where: { role: 'OFFICER' } });
      officerId = officer ? officer.id : 'b1000000-0000-0000-0000-000000000001';
    }

    const key = `verification_submission:${resolvedId}`;
    const setting = await prisma.systemSettings.findUnique({ where: { key } });
    const currentSubmission = setting?.value as any || {};

    const decision = decisionData.decision;
    let newStatus: 'Pending' | 'InProgress' | 'Resolved' | 'Closed' = 'InProgress';
    let newStage = 3;
    let actionLabel = 'Officer Review';

    if (decision === 'Approve') {
      newStatus = 'Resolved';
      newStage = 4;
      actionLabel = 'Repair Approved by Officer';
      currentSubmission.status = 'Approved';
      currentSubmission.approvedAt = new Date().toISOString();
      currentSubmission.approvedBy = officerId;
      currentSubmission.officerFeedback = {
        decision: 'Approved',
        note: decisionData.note || 'Work verified and approved by municipal inspector.',
        timestamp: new Date().toISOString(),
      };
    } else if (decision === 'Rework') {
      newStatus = 'InProgress';
      newStage = 2;
      actionLabel = 'Rework Requested by Officer';
      currentSubmission.status = 'Rework Required';
      currentSubmission.reworkRequestedAt = new Date().toISOString();
      currentSubmission.reworkRequestedBy = officerId;
      currentSubmission.officerFeedback = {
        decision: 'Rework Required',
        note: decisionData.note || 'Additional repair work required to meet municipal standards.',
        corrections: decisionData.corrections || [],
        timestamp: new Date().toISOString(),
      };
    } else {
      newStatus = 'InProgress';
      newStage = 3;
      actionLabel = 'Manual Inspection Scheduled';
      currentSubmission.status = 'Under Review';
      currentSubmission.officerFeedback = {
        decision: 'Review',
        note: decisionData.note || 'On-site physical inspection scheduled.',
        timestamp: new Date().toISOString(),
      };
    }

    await prisma.systemSettings.upsert({
      where: { key },
      update: { value: currentSubmission },
      create: { key, value: currentSubmission },
    });

    const updatedIncident = await prisma.incident.update({
      where: { id: resolvedId },
      data: {
        status: newStatus,
        currentStage: newStage,
        resolutionDate: decision === 'Approve' ? new Date() : undefined,
        resolutionDescription: decisionData.note || currentSubmission.summary || 'Officer review completed',
      },
    });

    await prisma.taskTimeline.create({
      data: {
        incidentId: resolvedId,
        userId: officerId,
        action: actionLabel,
        note: decisionData.note || `Decision: ${decision}. Feedback registered.`,
      },
    }).catch(() => {});

    return {
      incident: updatedIncident,
      submission: currentSubmission,
    };
  }

  /**
   * Retrieve complete audit trail and timeline from PostgreSQL TaskTimeline.
   */
  async getIncidentTimeline(idOrCode: string) {
    const resolvedId = await this.resolveIncidentUUID(idOrCode);
    if (!resolvedId) {
      const err = new Error('Incident not found');
      (err as any).statusCode = 404;
      throw err;
    }

    const timelines = await prisma.taskTimeline.findMany({
      where: { incidentId: resolvedId },
      include: {
        user: { select: { id: true, email: true, role: true, profileData: true } },
      },
      orderBy: { timestamp: 'asc' },
    });

    return timelines;
  }
}

export const incidentService = new IncidentService();
