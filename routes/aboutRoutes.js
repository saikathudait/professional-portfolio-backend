import express from 'express';
import { getAbout, updateAbout } from '../controllers/aboutController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAbout);
router.put('/', protect, admin, updateAbout);

export default router;