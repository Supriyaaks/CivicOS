import { Router } from 'express';
import { resourceController } from '../controllers/resource.controller';

const router = Router();

router.get('/pools', resourceController.getPools);
router.post('/allocate', resourceController.allocate);
router.post('/release', resourceController.release);
router.get('/recommendations', resourceController.getRecommendations);

export default router;
