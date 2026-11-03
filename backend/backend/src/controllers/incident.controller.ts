import { Request, Response, NextFunction } from 'express';
import { incidentService } from '../services/incident.service';
import { CreateIncidentSchema, UpdateIncidentSchema, IncidentFilterSchema, uuidSchema } from '../types/incident.types';

export class IncidentController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const incident = await incidentService.createIncident(req.body);
      res.status(201).json({ success: true, data: incident });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const incidents = await incidentService.getAllIncidents(req.query);
      res.json({ success: true, data: incidents });
    } catch (error) {
      next(error);
    }
  }

  async getNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude, radiusKm, status, category, limit } = req.query;

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radius = parseFloat((radiusKm as string) || '5');
      const maxLimit = parseInt((limit as string) || '50', 10);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing latitude. Must be a valid numeric coordinate between -90 and 90.'
        });
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing longitude. Must be a valid numeric coordinate between -180 and 180.'
        });
      }
      if (isNaN(radius) || radius <= 0 || radius > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid radiusKm. Must be between 0.1 and 100 kilometers.'
        });
      }

      const incidents = await incidentService.getNearbyIncidents({
        latitude: lat,
        longitude: lng,
        radiusKm: radius,
        status: status as string,
        category: category as string,
        limit: maxLimit,
      });

      res.json({
        success: true,
        count: incidents.length,
        searchedLocation: { latitude: lat, longitude: lng },
        radiusKm: radius,
        data: incidents,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const incident = await incidentService.getIncidentById(id);
      res.json({ success: true, data: incident });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const incident = await incidentService.updateIncident(id, req.body);
      res.json({ success: true, data: incident });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const { status, stage, currentStage, note } = req.body;
      const targetStage = typeof stage === 'number' ? stage : typeof currentStage === 'number' ? currentStage : 1;
      const incident = await incidentService.updateStatus(id, status, targetStage, note);
      res.json({ success: true, data: incident });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      await incidentService.deleteIncident(id);
      res.json({ success: true, message: 'Incident deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async addEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const evidence = await incidentService.addEvidence(id, req.body);
      res.status(201).json({ success: true, data: evidence });
    } catch (error) {
      next(error);
    }
  }

  async getEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const evidenceList = await incidentService.getIncidentEvidence(id);
      res.json({ success: true, data: evidenceList });
    } catch (error) {
      next(error);
    }
  }

  async uploadEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const evidence = await incidentService.uploadEvidenceFile(id, req.body);
      res.status(201).json({ success: true, data: evidence });
    } catch (error) {
      next(error);
    }
  }

  async getChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const checklist = await incidentService.getChecklist(id);
      res.json({ success: true, data: checklist });
    } catch (error) {
      next(error);
    }
  }

  async updateChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const { items, updatedBy } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'Items array is required' });
      }

      const updated = await incidentService.updateChecklist(id, items, updatedBy);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async getVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const data = await incidentService.getVerification(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async submitVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const submission = await incidentService.submitVerification(id, req.body);
      res.status(201).json({ success: true, data: submission });
    } catch (error) {
      next(error);
    }
  }

  async recordOfficerDecision(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const result = await incidentService.recordOfficerDecision(id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) return res.status(400).json({ success: false, message: 'Incident ID is required' });

      const timeline = await incidentService.getIncidentTimeline(id);
      res.json({ success: true, data: timeline });
    } catch (error) {
      next(error);
    }
  }

  async getStorageStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await incidentService.getStorageStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
}

export const incidentController = new IncidentController();
