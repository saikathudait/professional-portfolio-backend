import express from 'express';
import { getGroqKeyStatus, updateGroqKey } from '../controllers/apiKeyController.js';
import { admin, protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/groq').get(protect, admin, getGroqKeyStatus).put(protect, admin, updateGroqKey);

export default router;
