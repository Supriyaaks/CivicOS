/**
 * CivicOS Person 3 Predictive Intelligence API Service
 * Connects Person 1's Frontend to Person 3's Predictive Intelligence Engine
 * via Person 4's Express Backend and direct proxies.
 */

export interface ModelMetrics {
  algorithm: string;
  test_accuracy: number;
  test_precision: number;
  test_recall: number;
  test_f1_score: number;
  roc_auc: number;
  confusion_matrix: {
    true_negative: number;
    false_positive: number;
    false_negative: number;
    true_positive: number;
  };
  feature_importances: Array<{
    feature: string;
    importance: number;
  }>;
}

export interface PredictiveRiskResult {
  cascading_risk_prediction: number;
  cascading_probability: number;
  risk_percentage: number;
  risk_tier: string;
  tier_color: string;
  recommended_stance: string;
  influencing_features: Array<{
    factor: string;
    importance_weight: number;
    input_value: any;
  }>;
  model_metadata?: {
    algorithm: string;
    test_accuracy: number;
    test_f1: number;
    roc_auc: number;
  };
}

export interface CascadeConsequence {
  consequence_id: string;
  parent_id: string;
  stage: 'Secondary' | 'Tertiary';
  depth: number;
  name: string;
  subsystem: string;
  reason: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  time_horizon: string;
  preventive_break_action: string;
}

export interface CascadeResult {
  root_incident_id: string;
  root_incident_type: string;
  root_severity: number;
  weather_amplified: boolean;
  graph_amplified: boolean;
  connected_causal_nodes_count: number;
  overall_threat_level: string;
  total_consequences_predicted: number;
  critical_consequences_count: number;
  high_consequences_count: number;
  consequences: CascadeConsequence[];
}

export interface HotspotCluster {
  cluster_id: number;
  center_latitude: number;
  center_longitude: number;
  incident_count: number;
  average_severity: number;
  risk_tier: string;
  dominant_incident_type: string;
  zones_covered: string[];
  wards_covered: string[];
  total_affected_population: number;
  incident_ids: string[];
}

export interface GeospatialHotspotsResponse {
  total_incidents_analyzed: number;
  clustering_algorithm: string;
  parameters: { eps_km: number; min_samples: number };
  hotspots_detected_count: number;
  hotspots: HotspotCluster[];
  zonal_density: Record<string, any>;
}

export interface WeatherRiskResult {
  threat_level: string;
  risk_multiplier: number;
  active_alerts: string[];
  material_stress_index: number;
  parameters: {
    rainfall_mm: number;
    wind_speed_kmh: number;
    temperature_c: number;
    humidity_pct: number;
  };
}

export interface ScoringResult {
  incident_evaluation: {
    severity_score: number;
    priority_score: number;
    severity_tier: string;
    priority_tier: string;
    factors: {
      intensity: number;
      population: number;
      geographical: number;
      cascading: number;
    };
    severity_details: any;
    priority_details: any;
  };
}

export interface RelationshipGraphResult {
  search_query?: string;
  incident_details?: any;
  connected_incidents_count: number;
  connected_incidents: Array<{
    incident_id: string;
    relationship_type: string;
    label: string;
    weight: number;
    distance_km: number;
    shared_zone: boolean;
    shared_ward: boolean;
    incident_details: any;
  }>;
  graph_summary: {
    total_nodes: number;
    total_edges: number;
    density: number;
    top_connected_hubs: Array<{
      incident_id: string;
      connections: number;
      dominant_type: string;
      zone: string;
    }>;
  };
  edges?: any[];
}

export const predictiveService = {
  /**
   * Check microservice health
   */
  async checkHealth() {
    try {
      const res = await fetch('/api/v1/predictive/health');
      if (!res.ok) return { online: false };
      const data = await res.json();
      return data.data;
    } catch {
      return { online: false };
    }
  },

  /**
   * Predict risk for an incident
   */
  async predictRisk(params: {
    incidentId?: string;
    incidentType?: string;
    category?: string;
    zone?: string;
    severityScore?: number;
    impactRadiusMeters?: number;
    affectedPopulation?: number;
    rainfallMm?: number;
    windSpeedKmh?: number;
    temperatureC?: number;
  }): Promise<{ prediction: PredictiveRiskResult; persistedToDB: boolean } | null> {
    try {
      const res = await fetch('/api/v1/predictive/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] predictRisk error:', err);
      return null;
    }
  },

  /**
   * Predict cascading consequence propagation tree
   */
  async predictCascade(params: {
    incidentId?: string;
    incidentType?: string;
    severityScore?: number;
    rainfallMm?: number;
    windSpeedKmh?: number;
    cascadingRiskFlag?: number;
  }): Promise<CascadeResult | null> {
    try {
      const res = await fetch('/api/v1/predictive/cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data?.cascade || null;
    } catch (err) {
      console.error('[PredictiveService] predictCascade error:', err);
      return null;
    }
  },

  /**
   * Get DBSCAN spatial hotspots
   */
  async getHotspots(epsKm = 1.5, minSamples = 3): Promise<GeospatialHotspotsResponse | null> {
    try {
      const res = await fetch(`/api/v1/predictive/hotspots?eps_km=${epsKm}&min_samples=${minSamples}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] getHotspots error:', err);
      return null;
    }
  },

  /**
   * Get GeoJSON map layers with impact buffers
   */
  async getMapLayers(category?: string, zone?: string, minSeverity = 1.0) {
    try {
      const query = new URLSearchParams();
      if (category) query.append('category', category);
      if (zone) query.append('zone', zone);
      query.append('min_severity', minSeverity.toString());

      const res = await fetch(`/api/v1/predictive/map-layers?${query.toString()}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('[PredictiveService] getMapLayers error:', err);
      return null;
    }
  },

  /**
   * Get incident relationship graph & connected ego-network
   */
  async getRelationships(incidentId?: string): Promise<RelationshipGraphResult | null> {
    try {
      const url = incidentId
        ? `/api/v1/predictive/relationships?incident_id=${encodeURIComponent(incidentId)}`
        : '/api/v1/predictive/relationships';
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] getRelationships error:', err);
      return null;
    }
  },

  /**
   * Evaluate weather risk and vulnerability
   */
  async analyzeWeather(params: {
    rainfallMm: number;
    windSpeedKmh: number;
    temperatureC: number;
    humidityPct?: number;
  }): Promise<WeatherRiskResult | null> {
    try {
      const res = await fetch('/api/v1/predictive/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] analyzeWeather error:', err);
      return null;
    }
  },

  /**
   * Evaluate composite severity & smart priority scores
   */
  async evaluateScores(params: {
    severityScore: number;
    impactRadiusMeters: number;
    affectedPopulation: number;
    cascadingRiskFlag?: number;
  }): Promise<ScoringResult | null> {
    try {
      const res = await fetch('/api/v1/predictive/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] evaluateScores error:', err);
      return null;
    }
  },

  /**
   * Evaluate prevention impact of an intervention
   */
  async evaluatePreventionImpact(incidentId: string, interventionName = 'drainage_clearance') {
    try {
      const res = await fetch('/api/v1/predictive/prevention-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, interventionName }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] evaluatePreventionImpact error:', err);
      return null;
    }
  },

  /**
   * Get machine learning model metrics
   */
  async getModelMetrics(): Promise<ModelMetrics | null> {
    try {
      const res = await fetch('/api/v1/predictive/model-metrics');
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] getModelMetrics error:', err);
      return null;
    }
  },

  /**
   * Feature 7: What-If Scenario Simulation
   */
  async simulateWhatIf(incidentId: string, scenarioParams: Record<string, any>) {
    try {
      const res = await fetch('/api/v1/predictive/simulation/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, scenarioParams }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] simulateWhatIf error:', err);
      return null;
    }
  },

  /**
   * Feature 8: Preventive Action Recommendations
   */
  async getActionRecommendations(incidentId: string) {
    try {
      const res = await fetch('/api/v1/predictive/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] getActionRecommendations error:', err);
      return null;
    }
  },

  /**
   * Complete Composite Intelligence Pipeline
   */
  async analyzeIncidentComposite(incidentData: Record<string, any>) {
    try {
      const res = await fetch('/api/v1/predictive/intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentData),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] analyzeIncidentComposite error:', err);
      return null;
    }
  },

  /**
   * Universal Location Intelligence
   */
  async getLocationOptions() {
    try {
      const res = await fetch('/api/v1/predictive/location/options');
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] getLocationOptions error:', err);
      return null;
    }
  },

  async getLocationByZone(zone: string) {
    try {
      const res = await fetch(`/api/v1/predictive/location/zone?zone=${encodeURIComponent(zone)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] getLocationByZone error:', err);
      return null;
    }
  },

  async getLocationByWard(ward: string) {
    try {
      const res = await fetch(`/api/v1/predictive/location/ward?ward=${encodeURIComponent(ward)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch (err) {
      console.error('[PredictiveService] getLocationByWard error:', err);
      return null;
    }
  },
};
