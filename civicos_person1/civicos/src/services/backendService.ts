/**
 * CivicOS Person 4 Express Backend API Service
 * Handles communication with Person 4's Node/Express/Prisma backend on port 5000.
 */

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || '';

export interface BackendHealthResponse {
  status: string;
  service: string;
  database: string;
  timestamp: string;
  uptime: number;
  version: string;
}

export interface SystemStatusSummary {
  backend: {
    status: string;
    port: number;
    uptime: number;
    timestamp: string;
  };
  database: {
    status: string;
    type: string;
    verified: boolean;
    totalIncidents: number;
    totalDepartments: number;
  };
  llm: {
    available: boolean;
    model: string;
    message: string;
    provider: string;
  };
  factualEngine: {
    available: boolean;
    dataGrounded: boolean;
    recordsLoaded: number;
  };
}

export interface AIChatResponse {
  content: string;
  model: string;
  source: 'ollama' | 'factual_engine' | 'fallback';
  dataSource?: string;
  recordsReferenced?: string[];
  intent?: string;
}

export interface LocationSuggestion {
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string;
  ward?: string;
  source?: string;
}

export const backendService = {
  /**
   * Health check for Person 4 Express Backend & DB
   */
  async checkHealth(): Promise<BackendHealthResponse | null> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/health`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('[BackendService] Health check unreachable:', err);
      return null;
    }
  },

  /**
   * Check Ollama local LLM and database grounding status
   */
  async checkAIStatus(): Promise<SystemStatusSummary | null> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/ai/status`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  },

  /**
   * Send question to AI Civic Assistant with live database grounding
   */
  async chatWithAssistant(query: string, context?: Record<string, any>): Promise<AIChatResponse> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context })
      });

      if (!res.ok) {
        let errDetail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.error) errDetail = errJson.error;
        } catch {}
        throw new Error(errDetail);
      }
      const json = await res.json();
      return json.data;
    } catch (err: any) {
      return {
        content: `Service Notice: Unable to communicate with the CivicOS AI Assistant (${err.message || 'offline'}). Please ensure the Express backend is running on port 5000.`,
        model: 'client-fallback',
        source: 'fallback'
      };
    }
  },

  /**
   * Fetch departments from Express backend
   */
  async getDepartments(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/departments`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch incidents from Express backend
   */
  async getIncidents(filters?: { departmentId?: string; status?: string; category?: string }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.departmentId) params.append('departmentId', filters.departmentId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);

      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents?${params.toString()}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Log road repair verification decision & audit trail
   */
  async logRoadRepairAudit(payload: {
    incidentId: string;
    verdict: string;
    confidence: number;
    officerDecision: string;
    notes?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/ai/road-repair-audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // =================== MODULE A: MUNICIPAL COMMAND DASHBOARD ===================

  async getDashboardStats(filters?: { ward?: string; departmentId?: string; severity?: string; status?: string; dateRange?: string }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters?.ward) params.append('ward', filters.ward);
      if (filters?.departmentId) params.append('departmentId', filters.departmentId);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.dateRange) params.append('dateRange', filters.dateRange);

      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/dashboard/stats?${params.toString()}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async getDashboardWorkload(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/dashboard/workload`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async getDashboardWards(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/dashboard/wards`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // =================== MODULE C: AUTOMATIC DEPARTMENT ASSIGNMENT ===================

  async getAssignmentRules(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/assignment/rules`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async runAutoAssign(incidentId?: string): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/assignment/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId })
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async overrideAssignment(incidentId: string, departmentId: string, reason: string, officerName?: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/assignment/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, departmentId, reason, officerName })
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async getAssignmentHistory(incidentId: string): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/assignment/history/${incidentId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async getUnassignedQueue(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/assignment/unassigned`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // =================== MODULE D: CROSS-DEPARTMENT COORDINATION ===================

  async getCoordinationRequests(filters?: { status?: string; incidentId?: string; deptId?: string }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.incidentId) params.append('incidentId', filters.incidentId);
      if (filters?.deptId) params.append('deptId', filters.deptId);

      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/coordination?${params.toString()}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async createCoordinationRequest(payload: {
    incidentId: string;
    fromDeptId: string;
    toDeptId: string;
    reason: string;
    officerName?: string;
  }): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/coordination/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async updateCoordinationStatus(id: string, status: string, officerComment?: string, officerName?: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/coordination/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, officerComment, officerName })
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async addCoordinationComment(id: string, author: string, department: string, text: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/coordination/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, department, text })
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // =================== MODULE E: RESOURCE OPTIMIZATION ===================

  async getResourcePools(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/resources/pools`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async allocateResources(payload: {
    incidentId: string;
    departmentId: string;
    personnel: number;
    vehicles: number;
    equipment: number;
    officerName?: string;
  }): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/resources/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async releaseResources(payload: {
    incidentId: string;
    departmentId: string;
    personnel: number;
    vehicles: number;
    equipment: number;
    officerName?: string;
  }): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/resources/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getResourceRecommendations(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/resources/recommendations`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // =================== MODULE F: EMERGENCY MODE ===================

  async getEmergencyStatus(): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/emergency/status`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async toggleEmergency(payload: {
    activate: boolean;
    officer: string;
    reason: string;
    severityLevel?: string;
  }): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/emergency/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // =================== MODULE G & I: CIVIC ANALYTICS & TIMELINE ===================

  async getAnalyticsOverview(filters?: { category?: string; ward?: string; startDate?: string; endDate?: string }): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.ward) params.append('ward', filters.ward);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/analytics/overview?${params.toString()}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async getRecurringPatterns(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/analytics/recurring`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async getIncidentTimeline(incidentId: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/analytics/timeline/${incidentId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // =================== MODULE J: DEPARTMENT PERFORMANCE ===================

  async getDepartmentPerformance(): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/departments/performance`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async updateDepartment(id: string, updates: any): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/departments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // =================== MODULE K: RESOLUTION WORKFLOW ===================

  async getIncidentById(id: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async updateIncident(id: string, updates: any): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  async updateIncidentStatus(id: string, status: string, stage: number, note?: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, currentStage: stage, note })
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // =================== MODULE L: NEARBY INCIDENTS & GEOCODING ===================

  /**
   * Retrieve real incidents from PostgreSQL within radiusKm around latitude/longitude
   */
  async getNearbyIncidents(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    status?: string;
    category?: string;
    limit?: number;
  }): Promise<{ incidents: any[]; count: number; searchedLocation: { latitude: number; longitude: number }; radiusKm: number } | null> {
    try {
      const query = new URLSearchParams({
        latitude: params.latitude.toString(),
        longitude: params.longitude.toString(),
        radiusKm: (params.radiusKm || 5).toString(),
      });

      if (params.status && params.status !== 'All' && params.status !== 'ALL') {
        query.append('status', params.status);
      }
      if (params.category && params.category !== 'All Categories' && params.category !== 'All') {
        query.append('category', params.category);
      }
      if (params.limit) {
        query.append('limit', params.limit.toString());
      }

      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/nearby?${query.toString()}`);
      if (!res.ok) return null;
      const json = await res.json();
      return {
        incidents: json.data || [],
        count: json.count || 0,
        searchedLocation: json.searchedLocation || { latitude: params.latitude, longitude: params.longitude },
        radiusKm: json.radiusKm || params.radiusKm || 5,
      };
    } catch (err) {
      console.error('[backendService] getNearbyIncidents failed:', err);
      return null;
    }
  },

  /**
   * Geocode location query to suggestions with coordinates
   */
  async searchLocations(query: string, limit = 5): Promise<LocationSuggestion[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      // 1. Try Backend Geocoding Service (Proxy with caching and municipal fallbacks)
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/geocoding/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {
      // Continue to direct fallback
    }

    // 2. Direct Nominatim fallback if backend proxy is temporarily unreachable
    try {
      const searchQuery = query.toLowerCase().includes('bengaluru') || query.toLowerCase().includes('bangalore')
        ? query
        : `${query}, Bengaluru, India`;

      const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=${limit}&addressdetails=1`);
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          return nomData.map((item: any) => ({
            displayName: item.display_name,
            name: item.name || item.display_name.split(',')[0],
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            type: item.type || item.class || 'locality',
            source: 'nominatim',
          }));
        }
      }
    } catch {
      // Fallback
    }

    return [];
  },

  /**
   * Reverse geocode coordinates to human-readable address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{ displayName: string; locality: string; ward?: string } | null> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data;
      }
    } catch {
      // Fallback
    }

    return {
      displayName: `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      locality: 'Current Location',
      ward: 'Central Sector',
    };
  },

  /**
   * Upload evidence photograph (base64 data URL) to backend persistent storage
   */
  async uploadTaskEvidence(
    incidentId: string,
    file: File,
    category: string = 'After Work',
    description: string = ''
  ): Promise<any> {
    const toBase64 = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
      });

    const fileData = await toBase64(file);
    const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(incidentId)}/evidence/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        category,
        description,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || 'Evidence upload failed');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch all evidence records for an incident from PostgreSQL
   */
  async getTaskEvidence(incidentId: string): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(incidentId)}/evidence`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch operational checklist for a task from PostgreSQL
   */
  async getTaskChecklist(incidentId: string): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(incidentId)}/checklist`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Update operational checklist for a task in PostgreSQL
   */
  async updateTaskChecklist(incidentId: string, items: any[]): Promise<any[]> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(incidentId)}/checklist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error('Failed to update checklist');
    const json = await res.json();
    return json.data || items;
  },

  /**
   * Retrieve verification state, submission, and readiness from PostgreSQL
   */
  async getTaskVerification(incidentId: string): Promise<any> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(incidentId)}/verification`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  /**
   * Submit completion evidence, work summary, and checklist for review
   */
  async submitTaskVerification(incidentId: string, payload: {
    summary: string;
    materials?: string;
    observations?: string;
    evidenceIds?: string[];
  }): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(incidentId)}/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || 'Verification submission failed');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Record Officer verification decision (Approve, Rework, Review)
   */
  async recordOfficerDecision(incidentId: string, decisionData: {
    decision: 'Approve' | 'Rework' | 'Review';
    note?: string;
    corrections?: string[];
  }): Promise<any> {
    const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(incidentId)}/verification/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decisionData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(err.message || 'Officer decision registration failed');
    }
    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch complete audit trail timeline from PostgreSQL
   */
  async getTaskTimeline(incidentId: string): Promise<any[]> {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/v1/incidents/${encodeURIComponent(incidentId)}/timeline`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }
};
