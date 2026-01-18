import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { saveBook, getBook, checkBookExists, deleteBook } from '../controllers/bookController.js';

const router = Router();

router.use(authenticate);

router.post('/', saveBook);
router.get('/:bookId', getBook);
router.get('/:bookId/check', checkBookExists);
router.delete('/:bookId', deleteBook);

export default router;

