import express from 'express';
import {
  getDashboardStats,
  trackPageView,
} from '../controllers/analyticsController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', protect, admin, getDashboardStats);
router.post('/pageview', trackPageView);

export default router;