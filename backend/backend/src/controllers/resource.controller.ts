import { Request, Response, NextFunction } from 'express';
import { resourceService } from '../services/resource.service';

export class ResourceController {
  async getPools(req: Request, res: Response, next: NextFunction) {
    try {
      const pools = await resourceService.getResourcePools();
      res.json({ success: true, data: pools });
    } catch (error) {
      next(error);
    }
  }

  async allocate(req: Request, res: Response, next: NextFunction) {
    try {
      const incidentId = req.body.incidentId;
      const departmentId = req.body.departmentId || req.body.department;
      const { personnel, vehicles, equipment, officerName } = req.body;
      if (!incidentId || !departmentId) {
        return res.status(400).json({ success: false, message: 'incidentId and departmentId are required' });
      }
      const result = await resourceService.allocateResources({
        incidentId,
        departmentId,
        personnel: Number(personnel) || 0,
        vehicles: Number(vehicles) || 0,
        equipment: Number(equipment) || 0,
        officerName
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async release(req: Request, res: Response, next: NextFunction) {
    try {
      const { incidentId, departmentId, personnel, vehicles, equipment, officerName } = req.body;
      if (!incidentId || !departmentId) {
        return res.status(400).json({ success: false, message: 'incidentId and departmentId are required' });
      }
      const result = await resourceService.releaseResources({
        incidentId,
        departmentId,
        personnel: Number(personnel) || 0,
        vehicles: Number(vehicles) || 0,
        equipment: Number(equipment) || 0,
        officerName
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const recommendations = await resourceService.getRecommendations();
      res.json({ success: true, data: recommendations });
    } catch (error) {
      next(error);
    }
  }
}

export const resourceController = new ResourceController();
