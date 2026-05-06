import { Router } from 'express';
import {
  submitFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  reanalyze,
  getSummary,
} from '../controllers/feedback.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/', submitFeedback);
router.get('/summary', authMiddleware, getSummary);
router.get('/', authMiddleware, getAllFeedback);
router.get('/:id', authMiddleware, getFeedbackById);
router.patch('/:id', authMiddleware, updateFeedbackStatus);
router.delete('/:id', authMiddleware, deleteFeedback);
router.post('/:id/reanalyze', authMiddleware, reanalyze);

export default router;