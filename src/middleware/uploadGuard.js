import multer from 'multer';
import { env } from '../config/env.js';

/** Accepts only bounded in-memory financial documents. */
export const uploadGuard = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeBytes },
  fileFilter(req, file, callback) {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    callback(null, allowed.includes(file.mimetype));
  }
}).single('file');
