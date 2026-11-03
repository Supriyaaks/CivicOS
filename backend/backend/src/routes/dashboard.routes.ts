import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

router.get('/stats', dashboardController.getStats);
router.get('/workload', dashboardController.getWorkload);
router.get('/wards', dashboardController.getWards);

export default router;
