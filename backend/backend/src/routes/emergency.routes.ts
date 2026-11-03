import { Router } from 'express';
import { emergencyController } from '../controllers/emergency.controller';

const router = Router();

router.get('/status', emergencyController.getStatus);
router.post('/toggle', emergencyController.toggle);

export default router;
