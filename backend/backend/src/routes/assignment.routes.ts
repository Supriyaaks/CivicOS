import { Router } from 'express';
import { assignmentController } from '../controllers/assignment.controller';

const router = Router();

router.get('/rules', assignmentController.getRules);
router.post('/auto-assign', assignmentController.runAutoAssign);
router.post('/override', assignmentController.manualOverride);
router.get('/history/:incidentId', assignmentController.getHistory);
router.get('/unassigned', assignmentController.getUnassigned);

export default router;
