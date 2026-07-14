import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDatabase from './config/database.js';
import { uploadsDir, ensureUploadsDir } from './config/uploads.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import aboutRoutes from './routes/aboutRoutes.js';
import educationRoutes from './routes/educationRoutes.js';
import experienceRoutes from './routes/experienceRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

dotenv.config();

const app = express();
let server;

app.set('trust proxy', 1);

app.use(helmet());

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const normalizeOrigin = (origin) =>
  origin ? origin.replace(/\/+$/, '') : origin;

const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      const error = new Error(`CORS blocked for origin: ${origin}`);
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use('/uploads', (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static(uploadsDir));

app.use('/api/uploads', (req, res) => {
  res.redirect(301, `/uploads${req.url}`);
});

app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/experience', experienceRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Portfolio API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      home: '/api/home',
      about: '/api/about',
      education: '/api/education',
      experience: '/api/experience',
      skills: '/api/skills',
      projects: '/api/projects',
      blogs: '/api/blogs',
      books: '/api/books',
      contact: '/api/contact',
      upload: '/api/upload',
      analytics: '/api/analytics',
    },
  });
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (!server) {
    process.exit(0);
    return;
  }

  server.close(() => {
    process.exit(0);
  });
};

const startServer = async () => {
  try {
    await connectDatabase();
    ensureUploadsDir();

    server = app.listen(PORT, () => {
      const mode = process.env.NODE_ENV || 'development';
      console.log(`Server running in ${mode} mode on http://localhost:${PORT}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the existing process or change PORT in backend/.env.`);
        process.exit(1);
      }

      console.error(`Server failed: ${error.message}`);
      process.exit(1);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (error) => {
  console.error(`Unhandled rejection: ${error.message}`);
  if (server) {
    server.close(() => process.exit(1));
    return;
  }
  process.exit(1);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
