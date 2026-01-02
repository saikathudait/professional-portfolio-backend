import express from 'express';
import {
  getSkills,
  getSkillsByCategory,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
} from '../controllers/skillController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(getSkills).post(protect, admin, createSkill);

router.get('/category', getSkillsByCategory);

router
  .route('/:id')
  .get(getSkillById)
  .put(protect, admin, updateSkill)
  .delete(protect, admin, deleteSkill);

export default router;