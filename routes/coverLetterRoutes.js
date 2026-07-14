import express from 'express';
import {
  deleteCoverLetter,
  getCoverLetter,
  updateCoverLetter,
} from '../controllers/coverLetterController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .get(getCoverLetter)
  .put(protect, admin, updateCoverLetter)
  .delete(protect, admin, deleteCoverLetter);

export default router;
