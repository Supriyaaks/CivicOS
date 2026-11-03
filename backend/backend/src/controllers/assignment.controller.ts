import { Request, Response, NextFunction } from 'express';
import { assignmentService } from '../services/assignment.service';

export class AssignmentController {
  async getRules(req: Request, res: Response, next: NextFunction) {
    try {
      const rules = assignmentService.getRules();
      res.json({ success: true, data: rules });
    } catch (error) {
      next(error);
    }
  }

  async runAutoAssign(req: Request, res: Response, next: NextFunction) {
    try {
      const { incidentId } = req.body || {};
      const results = await assignmentService.runAutoAssign(incidentId);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  async manualOverride(req: Request, res: Response, next: NextFunction) {
    try {
      const incidentId = req.body.incidentId;
      const departmentId = req.body.departmentId || req.body.targetDepartment || req.body.department;
      const reason = req.body.reason;
      const officerName = req.body.officerName;
      if (!incidentId || !departmentId) {
        return res.status(400).json({ success: false, message: 'incidentId and departmentId are required' });
      }
      const result = await assignmentService.manualOverride(incidentId, departmentId, reason, officerName);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const incidentId = Array.isArray(req.params.incidentId) ? req.params.incidentId[0] : req.params.incidentId;
      const history = assignmentService.getAssignmentHistory(incidentId);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  async getUnassigned(req: Request, res: Response, next: NextFunction) {
    try {
      const queue = assignmentService.getUnassignedQueue();
      res.json({ success: true, data: queue });
    } catch (error) {
      next(error);
    }
  }
}

export const assignmentController = new AssignmentController();
