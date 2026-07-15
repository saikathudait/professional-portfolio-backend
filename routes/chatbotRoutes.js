import express from 'express';
import rateLimit from 'express-rate-limit';
import { sendChatMessage } from '../controllers/chatbotController.js';

const router = express.Router();

const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  message: {
    success: false,
    message: 'Too many chatbot messages. Please wait a minute and try again.',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

router.post('/message', chatbotLimiter, sendChatMessage);

export default router;
