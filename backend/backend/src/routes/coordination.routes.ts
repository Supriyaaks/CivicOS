import { Router } from 'express';
import { coordinationController } from '../controllers/coordination.controller';

const router = Router();

router.get('/', coordinationController.getAll);
router.post('/request', coordinationController.create);
router.patch('/:id/status', coordinationController.updateStatus);
router.post('/:id/comment', coordinationController.addComment);

export default router;
