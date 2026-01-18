import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProgress, getAllProgress, saveProgress } from '../controllers/progressController.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllProgress);
router.get('/:bookId', getProgress);
router.put('/:bookId', saveProgress);

export default router;

