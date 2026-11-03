import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/overview', analyticsController.getOverview);
router.get('/recurring', analyticsController.getRecurring);
router.get('/timeline/:incidentId', analyticsController.getTimeline);

export default router;
