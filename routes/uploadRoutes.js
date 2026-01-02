import express from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
} from '../controllers/uploadController.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/', protect, admin, upload.single('file'), uploadImage);
router.post(
  '/multiple',
  protect,
  admin,
  upload.array('files', 10),
  uploadMultipleImages
);
router.delete('/:publicId', protect, admin, deleteImage);

export default router;