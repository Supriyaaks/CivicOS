import { Request, Response, NextFunction } from 'express';
import { predictiveService } from '../services/predictive.service';

export class PredictiveController {
  async health(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await predictiveService.checkServiceHealth();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async predictRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.predictRisk(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async predictCascade(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.predictCascade(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getHotspots(req: Request, res: Response, next: NextFunction) {
    try {
      const epsKm = req.query.eps_km ? Number(req.query.eps_km) : 1.5;
      const minSamples = req.query.min_samples ? Number(req.query.min_samples) : 3;
      const hotspots = await predictiveService.getHotspots(epsKm, minSamples);
      res.json({ success: true, data: hotspots });
    } catch (error) {
      next(error);
    }
  }

  async getMapLayers(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string | undefined;
      const zone = req.query.zone as string | undefined;
      const minSeverity = req.query.min_severity ? Number(req.query.min_severity) : 1.0;
      const layers = await predictiveService.getMapLayers(category, zone, minSeverity);
      res.json(layers);
    } catch (error) {
      next(error);
    }
  }

  async getRelationships(req: Request, res: Response, next: NextFunction) {
    try {
      const incidentId = req.query.incident_id as string | undefined;
      const maxDistanceKm = req.query.max_distance_km ? Number(req.query.max_distance_km) : 2.0;
      const minWeight = req.query.min_weight ? Number(req.query.min_weight) : 0.35;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const relationships = await predictiveService.getRelationships(incidentId, maxDistanceKm, minWeight, limit);
      res.json({ success: true, data: relationships });
    } catch (error) {
      next(error);
    }
  }

  async analyzeWeather(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.analyzeWeather(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async evaluateScores(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.evaluateScores(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async evaluatePreventionImpact(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.evaluatePreventionImpact(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getModelMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await predictiveService.getModelMetrics();
      res.json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }

  async simulateWhatIf(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.simulateWhatIf(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getActionRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.getActionRecommendations(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async analyzeIncidentComposite(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.analyzeIncidentComposite(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLocationOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await predictiveService.getLocationOptions();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLocationByZone(req: Request, res: Response, next: NextFunction) {
    try {
      const zone = (req.query.zone as string) || 'South Zone';
      const result = await predictiveService.getLocationByZone(zone);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLocationByWard(req: Request, res: Response, next: NextFunction) {
    try {
      const ward = (req.query.ward as string) || 'Ward 14';
      const result = await predictiveService.getLocationByWard(ward);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLocationByRadius(req: Request, res: Response, next: NextFunction) {
    try {
      const lat = Number(req.query.latitude) || 12.9716;
      const lon = Number(req.query.longitude) || 77.5946;
      const radiusKm = Number(req.query.radius_km) || 2.0;
      const result = await predictiveService.getLocationByRadius(lat, lon, radiusKm);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLocationByBoundingBox(req: Request, res: Response, next: NextFunction) {
    try {
      const minLat = Number(req.query.min_lat) || 12.90;
      const minLon = Number(req.query.min_lon) || 77.55;
      const maxLat = Number(req.query.max_lat) || 13.00;
      const maxLon = Number(req.query.max_lon) || 77.65;
      const result = await predictiveService.getLocationByBoundingBox(minLat, minLon, maxLat, maxLon);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const predictiveController = new PredictiveController();
