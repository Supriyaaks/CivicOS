import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { ward, departmentId, severity, status, dateRange } = req.query as Record<string, string>;
      const stats = await dashboardService.getStats({ ward, departmentId, severity, status, dateRange });
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getWorkload(req: Request, res: Response, next: NextFunction) {
    try {
      const workload = await dashboardService.getWorkload();
      res.json({ success: true, data: workload });
    } catch (error) {
      next(error);
    }
  }

  async getWards(req: Request, res: Response, next: NextFunction) {
    try {
      const wards = await dashboardService.getWards();
      res.json({ success: true, data: wards });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
