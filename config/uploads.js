import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.LAMBDA_TASK_ROOT) ||
  (process.env.AWS_EXECUTION_ENV || '').includes('AWS_Lambda');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.join(__dirname, '..');

const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : isServerless
    ? path.join('/tmp', 'uploads')
    : path.join(backendRoot, 'uploads');

const ensureUploadsDir = () => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return true;
  } catch (error) {
    if (error && error.code !== 'EEXIST') {
      console.warn(`Uploads directory unavailable: ${error.message}`);
    }
    return false;
  }
};

const resolveUploadsPath = (filePath) => {
  if (!filePath) return null;
  const normalized = filePath.replace(/^[\\/]+/, '');
  if (!/^uploads[\\/]/.test(normalized)) return null;
  const relativePath = normalized.replace(/^uploads[\\/]+/, '');
  return path.join(uploadsDir, relativePath);
};

export { uploadsDir, ensureUploadsDir, isServerless, resolveUploadsPath };
