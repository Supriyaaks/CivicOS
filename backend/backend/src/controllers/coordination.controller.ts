import { Request, Response, NextFunction } from 'express';
import { coordinationService } from '../services/coordination.service';

export class CoordinationController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, incidentId, deptId } = req.query as Record<string, string>;
      const requests = await coordinationService.getAllRequests({ status, incidentId, deptId });
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const incidentId = req.body.incidentId;
      const fromDeptId = req.body.fromDeptId || req.body.fromDept;
      const toDeptId = req.body.toDeptId || req.body.toDept;
      const reason = req.body.reason || req.body.message;
      const officerName = req.body.officerName;
      if (!incidentId || !fromDeptId || !toDeptId || !reason) {
        return res.status(400).json({ success: false, message: 'incidentId, fromDeptId, toDeptId, and reason are required' });
      }
      const request = await coordinationService.createRequest({ incidentId, fromDeptId, toDeptId, reason, officerName });
      res.status(201).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, officerComment, officerName } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
      }
      const updated = await coordinationService.updateStatus(id, status, officerComment, officerName);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { author, department, text } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: 'text is required' });
      }
      const updated = await coordinationService.addComment(id, author, department, text);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export const coordinationController = new CoordinationController();
