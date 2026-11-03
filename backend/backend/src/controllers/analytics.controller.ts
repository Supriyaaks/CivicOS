import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, ward, startDate, endDate } = req.query as Record<string, string>;
      const overview = await analyticsService.getOverview({ category, ward, startDate, endDate });
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  }

  async getRecurring(req: Request, res: Response, next: NextFunction) {
    try {
      const recurring = await analyticsService.getRecurringPatterns();
      res.json({ success: true, data: recurring });
    } catch (error) {
      next(error);
    }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const incidentId = Array.isArray(req.params.incidentId) ? req.params.incidentId[0] : req.params.incidentId;
      const timeline = await analyticsService.getIncidentTimeline(incidentId);
      res.json({ success: true, data: timeline });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
