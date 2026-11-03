import { Request, Response, NextFunction } from 'express';
import { emergencyService } from '../services/emergency.service';

export class EmergencyController {
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await emergencyService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const { activate, officer, reason, severityLevel } = req.body;
      const status = await emergencyService.toggleEmergency({
        activate: Boolean(activate),
        officer: officer || 'Municipal Officer',
        reason: reason || 'Standard protocol activation',
        severityLevel
      });
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
}

export const emergencyController = new EmergencyController();
