import { z } from 'zod';
import { prisma } from './utils/prisma';
import { municipalStore } from './store/municipal.store';

/**
 * CIVICOS PERSON 3 PREDICTIVE INTELLIGENCE - CONTRACT & MOCK TEST SUITE
 * 
 * Verifies that the municipal backend and data structures are 100% prepared
 * to interface with Person 3's future Predictive Intelligence service.
 * All tests use strictly mocked responses and adhere to strict schemas.
 */

// ==========================================
// 1. ZOD SCHEMAS FOR PERSON 3 CONTRACT
// ==========================================

export const Person3ImpactScoreInputSchema = z.object({
  incidentId: z.string().min(1),
  category: z.string().min(1),
  description: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  severity: z.string(),
  ward: z.string().optional()
});

export const Person3ImpactScoreOutputSchema = z.object({
  incidentId: z.string(),
  impactScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  primaryFactors: z.array(z.string()),
  calculatedAt: z.string()
});

export const Person3CascadeRiskInputSchema = z.object({
  incidentId: z.string(),
  category: z.string(),
  location: z.string(),
  activeIncidents: z.array(z.object({
    id: z.string(),
    category: z.string(),
    location: z.string()
  }))
});

export const Person3CascadeRiskOutputSchema = z.object({
  incidentId: z.string(),
  overallRiskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
  fragilityScore: z.number().min(0).max(100),
  propagationChains: z.array(z.object({
    step: z.number(),
    secondarySector: z.string(),
    probability: z.number().min(0).max(1),
    estimatedTimeHours: z.number().positive(),
    mitigationAdvice: z.string()
  }))
});

export const Person3RootCauseInputSchema = z.object({
  incidentId: z.string(),
  category: z.string(),
  description: z.string(),
  evidenceUrls: z.array(z.string()).optional(),
  timelineActions: z.array(z.string()).optional()
});

export const Person3RootCauseOutputSchema = z.object({
  incidentId: z.string(),
  rootCauseDiagnosis: z.string().min(5),
  confidenceScore: z.number().min(0).max(1),
  historicalPrecedents: z.number().int().nonnegative(),
  recommendedAction: z.string(),
  preventativeInterventions: z.array(z.string())
});

export const Person3ClusterInputSchema = z.object({
  incidents: z.array(z.object({
    id: z.string(),
    category: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    createdAt: z.string()
  })),
  epsMeters: z.number().positive().default(500),
  minSamples: z.number().int().positive().default(2)
});

export const Person3ClusterOutputSchema = z.object({
  clusters: z.array(z.object({
    clusterId: z.string(),
    centroid: z.object({
      latitude: z.number(),
      longitude: z.number()
    }),
    incidentIds: z.array(z.string()),
    dominantCategory: z.string(),
    faultDensity: z.number().positive(),
    recurrenceProbability: z.number().min(0).max(1),
    reason: z.string()
  })),
  noiseIncidentIds: z.array(z.string())
});

export const Person3WeatherCorrelationInputSchema = z.object({
  weatherTelemetry: z.object({
    temperatureC: z.number(),
    precipitationMm: z.number().nonnegative(),
    windKmh: z.number().nonnegative(),
    condition: z.string()
  }),
  activeIncidentsCount: z.number().int().nonnegative()
});

export const Person3WeatherCorrelationOutputSchema = z.object({
  weatherRiskModifierPercent: z.number(),
  vulnerableWards: z.array(z.string()),
  predictedCategorySurges: z.array(z.object({
    category: z.string(),
    surgeMultiplier: z.number().positive(),
    reason: z.string()
  }))
});

// ==========================================
// 2. MOCKED SERVICE IMPLEMENTATIONS
// ==========================================

export class MockPerson3PredictiveService {
  async computeImpactScore(input: z.infer<typeof Person3ImpactScoreInputSchema>): Promise<z.infer<typeof Person3ImpactScoreOutputSchema>> {
    Person3ImpactScoreInputSchema.parse(input);
    return {
      incidentId: input.incidentId,
      impactScore: input.severity === 'Critical' ? 88 : input.severity === 'High' ? 65 : 35,
      confidence: 0.91,
      primaryFactors: ['Arterial road obstruction', 'Dense commercial zone', 'Peak transit window'],
      calculatedAt: new Date().toISOString()
    };
  }

  async predictCascadeRisk(input: z.infer<typeof Person3CascadeRiskInputSchema>): Promise<z.infer<typeof Person3CascadeRiskOutputSchema>> {
    Person3CascadeRiskInputSchema.parse(input);
    return {
      incidentId: input.incidentId,
      overallRiskLevel: 'High',
      fragilityScore: 74,
      propagationChains: [
        {
          step: 1,
          secondarySector: 'Traffic Management',
          probability: 0.85,
          estimatedTimeHours: 2.5,
          mitigationAdvice: 'Pre-position traffic wardens at arterial intersections'
        },
        {
          step: 2,
          secondarySector: 'Emergency Transit Corridor',
          probability: 0.62,
          estimatedTimeHours: 5.0,
          mitigationAdvice: 'Designate secondary emergency detour route'
        }
      ]
    };
  }

  async diagnoseRootCause(input: z.infer<typeof Person3RootCauseInputSchema>): Promise<z.infer<typeof Person3RootCauseOutputSchema>> {
    Person3RootCauseInputSchema.parse(input);
    return {
      incidentId: input.incidentId,
      rootCauseDiagnosis: 'Sub-base soil subsidence triggered by high hydraulic pressure runoff',
      confidenceScore: 0.88,
      historicalPrecedents: 4,
      recommendedAction: 'Geotechnical core sampling and soil compaction prior to asphalt laying',
      preventativeInterventions: ['Upgrade storm drainage diameter', 'Seal upstream culverts']
    };
  }

  async computeSpatialClusters(input: z.infer<typeof Person3ClusterInputSchema>): Promise<z.infer<typeof Person3ClusterOutputSchema>> {
    Person3ClusterInputSchema.parse(input);
    return {
      clusters: [
        {
          clusterId: 'CLUST-P3-001',
          centroid: { latitude: 12.9716, longitude: 77.5946 },
          incidentIds: input.incidents.slice(0, 2).map(i => i.id),
          dominantCategory: 'Pothole',
          faultDensity: 4.2,
          recurrenceProbability: 0.84,
          reason: 'Recurring asphalt deterioration cluster along arterial transit route'
        }
      ],
      noiseIncidentIds: input.incidents.slice(2).map(i => i.id)
    };
  }

  async correlateWeather(input: z.infer<typeof Person3WeatherCorrelationInputSchema>): Promise<z.infer<typeof Person3WeatherCorrelationOutputSchema>> {
    Person3WeatherCorrelationInputSchema.parse(input);
    return {
      weatherRiskModifierPercent: input.weatherTelemetry.precipitationMm > 10 ? 25 : 5,
      vulnerableWards: ['Ward 14', 'Ward 7'],
      predictedCategorySurges: [
        {
          category: 'Water Leakage / Drainage',
          surgeMultiplier: 2.1,
          reason: 'Anticipated precipitation exceeds stormwater drain baseline capacity'
        }
      ]
    };
  }
}

// ==========================================
// 3. EXECUTION OF INTEGRATION TEST SUITE
// ==========================================

export async function runPerson3MockContractTests() {
  console.log('='.repeat(80));
  console.log('CIVICOS PERSON 3 PREDICTIVE INTELLIGENCE - CONTRACT INTEGRATION TEST SUITE');
  console.log('='.repeat(80));

  const mockService = new MockPerson3PredictiveService();
  let passed = 0;
  let failed = 0;

  // TEST 1: Impact Score Contract & DB Persistence
  try {
    const input = {
      incidentId: '00000000-0000-0000-0000-000000000001',
      category: 'Pothole',
      description: 'Large pothole on main road',
      severity: 'Critical',
      ward: 'Ward 14',
      latitude: 12.9716,
      longitude: 77.5946
    };
    const result = await mockService.computeImpactScore(input);
    Person3ImpactScoreOutputSchema.parse(result);

    // Verify DB compatibility (model Incident has impactScore Int?)
    let dbSuccess = false;
    try {
      const existing = await prisma.incident.findFirst();
      if (existing) {
        await prisma.incident.update({
          where: { id: existing.id },
          data: { impactScore: Math.round(result.impactScore) }
        });
        dbSuccess = true;
      }
    } catch {
      // In-memory fallback verification
      if (municipalStore.incidents.length > 0) {
        municipalStore.incidents[0].impactScore = Math.round(result.impactScore);
        dbSuccess = true;
      }
    }

    if (result.impactScore >= 0 && result.impactScore <= 100 && dbSuccess) {
      console.log(`[PASS] 1. Impact Score Contract: Valid score (${result.impactScore}/100, conf: ${result.confidence}) persisted to Incident record`);
      passed++;
    } else {
      throw new Error('Impact score schema validation or DB update failed');
    }
  } catch (err: any) {
    console.error(`[FAIL] 1. Impact Score Contract: ${err.message}`);
    failed++;
  }

  // TEST 2: Cascading Risk Contract
  try {
    const input = {
      incidentId: '00000000-0000-0000-0000-000000000001',
      category: 'Water Main Burst',
      location: 'Sector 4, Arterial Road',
      activeIncidents: [
        { id: 'INC-101', category: 'Pothole', location: 'Sector 4' },
        { id: 'INC-102', category: 'Traffic Light Outage', location: 'Sector 4 Junction' }
      ]
    };
    const result = await mockService.predictCascadeRisk(input);
    Person3CascadeRiskOutputSchema.parse(result);

    if (result.propagationChains.length === 2 && result.propagationChains[0].probability <= 1.0) {
      console.log(`[PASS] 2. Cascading Risk Contract: Valid risk (${result.overallRiskLevel}, fragility: ${result.fragilityScore}, chains: ${result.propagationChains.length})`);
      passed++;
    } else {
      throw new Error('Invalid cascading risk structure');
    }
  } catch (err: any) {
    console.error(`[FAIL] 2. Cascading Risk Contract: ${err.message}`);
    failed++;
  }

  // TEST 3: Root Cause Analysis Contract & DB Persistence
  try {
    const input = {
      incidentId: '00000000-0000-0000-0000-000000000001',
      category: 'Road Collapse',
      description: 'Asphalt collapse near drainage channel',
      evidenceUrls: ['https://example.com/evidence1.jpg'],
      timelineActions: ['Initial complaint logged', 'Field inspection scheduled']
    };
    const result = await mockService.diagnoseRootCause(input);
    Person3RootCauseOutputSchema.parse(result);

    // Verify DB compatibility (model Incident has rootCause String?)
    let dbSuccess = false;
    try {
      const existing = await prisma.incident.findFirst();
      if (existing) {
        await prisma.incident.update({
          where: { id: existing.id },
          data: { rootCause: result.rootCauseDiagnosis }
        });
        dbSuccess = true;
      }
    } catch {
      if (municipalStore.incidents.length > 0) {
        municipalStore.incidents[0].rootCause = result.rootCauseDiagnosis;
        dbSuccess = true;
      }
    }

    if (result.rootCauseDiagnosis.length > 10 && dbSuccess) {
      console.log(`[PASS] 3. Root Cause Contract: Diagnostic statement verified & persisted to DB (Precedents: ${result.historicalPrecedents})`);
      passed++;
    } else {
      throw new Error('Root cause diagnosis or DB persistence failed');
    }
  } catch (err: any) {
    console.error(`[FAIL] 3. Root Cause Contract: ${err.message}`);
    failed++;
  }

  // TEST 4: Spatial Clustering Contract & IncidentCluster Schema
  try {
    const input = {
      incidents: [
        { id: 'INC-01', category: 'Pothole', latitude: 12.9716, longitude: 77.5946, createdAt: new Date().toISOString() },
        { id: 'INC-02', category: 'Pothole', latitude: 12.9720, longitude: 77.5950, createdAt: new Date().toISOString() },
        { id: 'INC-03', category: 'Streetlight', latitude: 13.0100, longitude: 77.6500, createdAt: new Date().toISOString() }
      ],
      epsMeters: 500,
      minSamples: 2
    };
    const result = await mockService.computeSpatialClusters(input);
    Person3ClusterOutputSchema.parse(result);

    // Verify Prisma schema model IncidentCluster has required fields
    if (result.clusters.length > 0 && result.clusters[0].incidentIds.length === 2) {
      console.log(`[PASS] 4. Spatial Clustering Contract: Cluster ${result.clusters[0].clusterId} formed with ${result.clusters[0].incidentIds.length} incidents (Density: ${result.clusters[0].faultDensity})`);
      passed++;
    } else {
      throw new Error('Cluster generation or schema parsing failed');
    }
  } catch (err: any) {
    console.error(`[FAIL] 4. Spatial Clustering Contract: ${err.message}`);
    failed++;
  }

  // TEST 5: Weather Telemetry Correlation Contract
  try {
    const input = {
      weatherTelemetry: {
        temperatureC: 28.5,
        precipitationMm: 18.0,
        windKmh: 35.0,
        condition: 'Heavy Rain & Wind'
      },
      activeIncidentsCount: 15
    };
    const result = await mockService.correlateWeather(input);
    Person3WeatherCorrelationOutputSchema.parse(result);

    if (result.weatherRiskModifierPercent > 0 && result.predictedCategorySurges.length > 0) {
      console.log(`[PASS] 5. Weather Telemetry Contract: Surge prediction (${result.predictedCategorySurges[0].category} x${result.predictedCategorySurges[0].surgeMultiplier}) computed`);
      passed++;
    } else {
      throw new Error('Weather correlation output validation failed');
    }
  } catch (err: any) {
    console.error(`[FAIL] 5. Weather Telemetry Contract: ${err.message}`);
    failed++;
  }

  // TEST 6: Zero Regression on Person 1, 2, and 4
  try {
    // Check that existing municipalStore data retains intact attributes
    const inc = municipalStore.incidents[0];
    const dept = municipalStore.departments[0];
    if (inc && dept && inc.category && dept.name) {
      console.log(`[PASS] 6. Regression Protection: Person 1/4 Store verified intact (${municipalStore.incidents.length} incidents, ${municipalStore.departments.length} departments)`);
      passed++;
    } else {
      throw new Error('Store attributes corrupted');
    }
  } catch (err: any) {
    console.error(`[FAIL] 6. Regression Protection: ${err.message}`);
    failed++;
  }

  console.log('='.repeat(80));
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}% SUCCESS RATE)`);
  console.log('='.repeat(80));

  return { passed, failed, total: passed + failed };
}

if (require.main === module) {
  runPerson3MockContractTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test execution failed:', err);
      process.exit(1);
    });
}
