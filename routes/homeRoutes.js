import express from 'express';
import {
  getHome,
  getResumeFile,
  updateHome,
  uploadResume,
} from '../controllers/homeController.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/', getHome);
router.get('/cv/file', getResumeFile);
router.put('/', protect, admin, updateHome);
router.post('/cv', protect, admin, upload.single('file'), uploadResume);

export default router;
