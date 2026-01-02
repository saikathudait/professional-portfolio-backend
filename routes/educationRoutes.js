import express from 'express';
import {
  getEducation,
  getEducationById,
  createEducation,
  updateEducation,
  deleteEducation,
} from '../controllers/educationController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(getEducation).post(protect, admin, createEducation);

router
  .route('/:id')
  .get(getEducationById)
  .put(protect, admin, updateEducation)
  .delete(protect, admin, deleteEducation);

export default router;