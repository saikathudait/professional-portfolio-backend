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
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(getBlogs).post(protect, admin, createBlog);

router.get('/categories/all', getBlogCategories);
router.get('/tags/all', getBlogTags);
router.get('/slug/:slug', getBlogBySlug);

router
  .route('/:id')
  .get(getBlogById)
  .put(protect, admin, updateBlog)
  .delete(protect, admin, deleteBlog);

export default router;