import express from 'express';
import {
  getBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogCategories,
  getBlogTags,
} from '../controllers/blogController.js';
import { protect, admin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(optionalAuth, getBlogs).post(protect, admin, createBlog);

router.get('/categories/all', optionalAuth, getBlogCategories);
router.get('/tags/all', optionalAuth, getBlogTags);
router.get('/slug/:slug', optionalAuth, getBlogBySlug);

router
  .route('/:id')
  .get(optionalAuth, getBlogById)
  .put(protect, admin, updateBlog)
  .delete(protect, admin, deleteBlog);

export default router;
