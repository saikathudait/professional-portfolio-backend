import express from 'express';
import {
  getContacts,
  getContactById,
  createContact,
  markAsRead,
  markAsReplied,
  deleteContact,
} from '../controllers/contactController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, admin, getContacts).post(createContact);

router
  .route('/:id')
  .get(protect, admin, getContactById)
  .delete(protect, admin, deleteContact);

router.put('/:id/read', protect, admin, markAsRead);
router.put('/:id/replied', protect, admin, markAsReplied);

export default router;