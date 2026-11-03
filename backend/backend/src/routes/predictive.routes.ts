import { Router } from 'express';
import { predictiveController } from '../controllers/predictive.controller';

const router = Router();

// Health check of Person 3 microservice
router.get('/health', predictiveController.health);

// Feature 3: Predictive ML Risk & Model Metrics
router.post('/risk', predictiveController.predictRisk);
router.get('/model-metrics', predictiveController.getModelMetrics);

// Feature 4: Cascading Consequence Propagation
router.post('/cascade', predictiveController.predictCascade);

// Feature 2: Geospatial Hotspots & Map Layers
router.get('/hotspots', predictiveController.getHotspots);
router.get('/map-layers', predictiveController.getMapLayers);

// Feature 1: Urban Incident Relationship Graph
router.get('/relationships', predictiveController.getRelationships);

// Feature 10: Weather-Based Risk Analysis
router.post('/weather', predictiveController.analyzeWeather);

// Features 5 & 6: Composite Severity and Smart Priority Scoring
router.post('/scoring', predictiveController.evaluateScores);

// Feature 9: Prevention Impact Scoring
router.post('/prevention-impact', predictiveController.evaluatePreventionImpact);

// Feature 7: What-If Simulation
router.post('/simulation/what-if', predictiveController.simulateWhatIf);

// Feature 8: Preventive Action Recommendations
router.post('/recommendations', predictiveController.getActionRecommendations);

// Complete Composite Intelligence Pipeline
router.post('/intelligence/analyze', predictiveController.analyzeIncidentComposite);

// Universal Location Intelligence
router.get('/location/options', predictiveController.getLocationOptions);
router.get('/location/zone', predictiveController.getLocationByZone);
router.get('/location/ward', predictiveController.getLocationByWard);
router.get('/location/radius', predictiveController.getLocationByRadius);
router.get('/location/bounding-box', predictiveController.getLocationByBoundingBox);

export default router;
