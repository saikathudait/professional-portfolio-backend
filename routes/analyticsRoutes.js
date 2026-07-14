import express from 'express';
import {
  getAnalysisStats,
  getDashboardStats,
  trackPageView,
} from '../controllers/analyticsController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', protect, admin, getDashboardStats);
router.get('/analysis', protect, admin, getAnalysisStats);
router.post('/pageview', trackPageView);

export default router;
