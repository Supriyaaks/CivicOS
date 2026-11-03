/**
 * CivicOS AI System Type Definitions
 * Matches contracts in ai_engine/PERSON_2_TO_PERSON_4_AI_HANDOVER.md
 */

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DetectionItem {
  class_id: number;
  confidence: number;
  bbox: number[]; // [x1, y1, x2, y2]
}

export interface DetectionResult {
  status: 'success' | 'error';
  detection_count: number;
  detections: DetectionItem[];
  message?: string;
}

export interface LitterDetectionItem {
  category: string;
  confidence: number;
  bbox: number[];
  class_id: number;
}

export interface LitterDetectionResult {
  status: 'success' | 'error';
  total_detected: number;
  detections: LitterDetectionItem[];
  inference_time_ms?: number;
  message?: string;
}

export interface RDDDetectionItem {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: number[];
}

export interface RDDDetectionResult {
  image_path?: string;
  detections: RDDDetectionItem[];
  inference_time?: number;
  message?: string;
}

export interface VerificationResult {
  status: 'verified' | 'mismatch' | 'needs_review';
  selected_category: string;
  detected_category: string | null;
  confidence: number;
  explanation: string;
}

export interface DuplicateEvidence {
  compare_to: string;
  distance: number;
  time_diff: number;
  similarity: number;
  reason: string;
}

export interface DuplicateResult {
  report_ids: string[];
  evidence: DuplicateEvidence[];
  recommendation: 'duplicate' | 'needs_review' | 'unique';
}

export interface AIReportProcessingResult {
  report_id: string;
  detection: DetectionResult;
  litter_detection?: LitterDetectionResult | null;
  rdd_detection?: RDDDetectionResult | null;
  verification: VerificationResult;
  duplicates?: DuplicateResult | any[];
  workflow_status: string;
}

export interface ResolutionResult {
  status: 'appears_resolved' | 'appears_unresolved' | 'needs_review';
  similarity_score: number;
  before_detections: DetectionItem[];
  after_detections: DetectionItem[];
  reason: string;
  confidence: number;
  recommendation: string;
}

export interface ResolutionVerificationResult {
  report_id: string;
  resolution: ResolutionResult;
  workflow_status: string;
}

export interface AIHealthStatus {
  status: 'online' | 'degraded' | 'offline';
  service: string;
  orchestrator_ready: boolean;
  models: {
    urban_community_detector: boolean;
    litter_detector: boolean;
    rdd_synthetic_detector: boolean;
    incident_verifier: boolean;
    duplicate_detector: boolean;
    resolution_verifier: boolean;
    road_repair_verifier?: boolean;
  };
}

export interface RoadRepairCandidate {
  id: string;
  report_id?: string;
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  evidence?: string;
  evidence_url?: string;
}

export interface RoadRepairMatch {
  candidate_id: string;
  title: string;
  status: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  distance_meters: number | null;
  visual_similarity: number;
  is_high_coincidence: boolean;
  match_reason: string;
  evidence_url?: string;
}

export interface RoadRepairMetrics {
  ssim_score: number;
  color_similarity: number;
  sharpness_score: number;
  quality_sufficient: boolean;
  viewpoint_comparable: boolean;
  pothole_still_present: boolean;
  residual_cracks_detected: boolean;
}

export interface RoadRepairVerificationData {
  status: 'appears_repaired' | 'repair_incomplete' | 'needs_manual_review' | 'possible_related_pothole';
  status_label: string;
  report_id: string;
  confidence: number;
  reason: string;
  recommendation: string;
  metrics: RoadRepairMetrics;
  repair_details?: {
    contractor?: string;
    materials?: string;
    completion_date?: string;
    work_order?: string;
    notes?: string;
  };
  before_detections: DetectionItem[];
  after_detections: DetectionItem[];
  rdd_detections: RDDDetectionItem[];
  related_pothole_matches: RoadRepairMatch[];
  timestamp: string;
}

export interface RoadRepairVerificationResult {
  report_id: string;
  verification: RoadRepairVerificationData;
  workflow_status: string;
}

export interface RoadRepairVerificationRequest {
  reportId: string;
  beforeImage: File | Blob;
  afterImage: File | Blob;
  latitude?: number;
  longitude?: number;
  repairDetails?: Record<string, any>;
  candidateReports?: RoadRepairCandidate[];
}
