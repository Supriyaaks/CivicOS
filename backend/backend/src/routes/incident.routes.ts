import { Router } from 'express';
import { incidentController } from '../controllers/incident.controller';

const router = Router();

// Storage Status Check
router.get('/storage/status', incidentController.getStorageStatus);

// Nearby Incidents (must be placed before /:id parameter route)
router.get('/nearby', incidentController.getNearby);

// Incident CRUD
router.post('/', incidentController.create);
router.get('/', incidentController.getAll);
router.get('/:id', incidentController.getById);
router.patch('/:id', incidentController.update);
router.patch('/:id/status', incidentController.updateStatus);
router.delete('/:id', incidentController.delete);

// Evidence Sub-routes
router.post('/:id/evidence/upload', incidentController.uploadEvidence);
router.post('/:id/evidence', incidentController.addEvidence);
router.get('/:id/evidence', incidentController.getEvidence);

// Task Checklist & Operational Tracking
router.get('/:id/checklist', incidentController.getChecklist);
router.put('/:id/checklist', incidentController.updateChecklist);

// Repair Verification & Officer Review
router.get('/:id/verification', incidentController.getVerification);
router.post('/:id/verification', incidentController.submitVerification);
router.post('/:id/verification/decision', incidentController.recordOfficerDecision);

// Audit Trail & Timeline
router.get('/:id/timeline', incidentController.getTimeline);

export default router;
