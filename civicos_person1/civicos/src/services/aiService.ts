/**
 * CivicOS AI Engine API Service
 * Connects Person 1's frontend to Person 2's AI Orchestrator via the backend API.
 */

import {
  AIReportProcessingResult,
  ResolutionVerificationResult,
  AIHealthStatus,
  RoadRepairVerificationRequest,
  RoadRepairVerificationResult
} from '../types/ai';
import { authService } from './authService';

// API Base URL - defaults to local FastAPI server on 8000 or relative proxy
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://127.0.0.1:8000';

export class AIConnectionError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'AIConnectionError';
  }
}

/**
 * Check if the AI Engine service is online and healthy.
 */
export async function checkAIHealth(): Promise<AIHealthStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    return {
      status: 'offline',
      service: 'CivicOS AI Engine',
      orchestrator_ready: false,
      models: {
        urban_community_detector: false,
        litter_detector: false,
        rdd_synthetic_detector: false,
        incident_verifier: false,
        duplicate_detector: false,
        resolution_verifier: false,
      }
    };
  }
}

/**
 * Process a new citizen complaint report through the AI pipeline:
 * - Urban Community 6-class detection
 * - Mini-TACO50 litter detection
 * - RDD synthetic road damage detection
 * - Incident verification
 * - Duplicate detection
 */
export async function processReportWithAI(params: {
  image: File;
  category: string;
  reportId?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  existingReports?: any[];
}): Promise<AIReportProcessingResult> {
  const formData = new FormData();
  formData.append('image', params.image);
  formData.append('reported_category', params.category);

  if (params.reportId) {
    formData.append('report_id', params.reportId);
  }
  if (params.latitude !== undefined && params.latitude !== null) {
    formData.append('latitude', params.latitude.toString());
  }
  if (params.longitude !== undefined && params.longitude !== null) {
    formData.append('longitude', params.longitude.toString());
  }
  if (params.timestamp) {
    formData.append('timestamp', params.timestamp);
  }
  if (params.existingReports && params.existingReports.length > 0) {
    formData.append('existing_reports', JSON.stringify(params.existingReports));
  }

  try {
    const token = await authService.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/reports/process`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`AI Processing failed (${res.status}): ${errorText || res.statusText}`);
    }

    const data: AIReportProcessingResult = await res.json();
    return data;
  } catch (err: any) {
    console.error('[CivicOS AI Service] Error communicating with AI backend:', err);
    throw new AIConnectionError(
      err.message || 'Unable to connect to CivicOS AI Engine service.',
      err
    );
  }
}

/**
 * Verify if a civic issue has been resolved by comparing before and after images.
 */
export async function verifyResolutionWithAI(params: {
  reportId: string;
  beforeImage: File;
  afterImage: File;
}): Promise<ResolutionVerificationResult> {
  const formData = new FormData();
  formData.append('report_id', params.reportId);
  formData.append('before_image', params.beforeImage);
  formData.append('after_image', params.afterImage);

  try {
    const token = await authService.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/reports/resolution-verify`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Resolution verification failed (${res.status}): ${errorText || res.statusText}`);
    }

    const data: ResolutionVerificationResult = await res.json();
    return data;
  } catch (err: any) {
    console.error('[CivicOS AI Service] Resolution verification error:', err);
    throw new AIConnectionError(
      err.message || 'Unable to verify resolution with AI service.',
      err
    );
  }
}

/**
 * Retrieve supported categories and normalization rules.
 */
export async function getSupportedCategories(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return fallback defaults if API offline
  }

  return {
    urban_community_classes: [
      "Animal",
      "Traffic Light",
      "Waste container",
      "Pothole",
      "Cracks",
      "Open manhole"
    ],
    litter_classes: ["Litter"],
    rdd_classes: [
      "D00 - Longitudinal Crack",
      "D10 - Transverse Crack",
      "D20 - Alligator Crack",
      "D40 - Pothole"
    ]
  };
}

/**
 * Verify road repair and perform cross-incident pothole comparison.
 */
export async function verifyRoadRepairWithAI(
  params: RoadRepairVerificationRequest
): Promise<RoadRepairVerificationResult> {
  const formData = new FormData();
  formData.append('report_id', params.reportId);
  formData.append('before_image', params.beforeImage);
  formData.append('after_image', params.afterImage);
  if (params.latitude !== undefined && params.latitude !== null) {
    formData.append('latitude', params.latitude.toString());
  }
  if (params.longitude !== undefined && params.longitude !== null) {
    formData.append('longitude', params.longitude.toString());
  }
  if (params.repairDetails) {
    formData.append('repair_details', JSON.stringify(params.repairDetails));
  }
  if (params.candidateReports && params.candidateReports.length > 0) {
    formData.append('candidate_reports', JSON.stringify(params.candidateReports));
  }

  try {
    const token = await authService.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/reports/road-repair-verify`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Road repair verification failed (${res.status}): ${errorText || res.statusText}`);
    }

    const data: RoadRepairVerificationResult = await res.json();
    return data;
  } catch (err: any) {
    console.error('[CivicOS AI Service] Road repair verification error:', err);
    throw new AIConnectionError(
      err.message || 'Unable to verify road repair with AI service.',
      err
    );
  }
}
