import multer from 'multer';
import { MAX_IMAGES } from '@propertyhub/shared';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

// Files are kept in memory, then streamed to Cloudinary (or local disk in dev).
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(ApiError.badRequest('Only JPG, PNG and WEBP images are allowed'));
  },
});

/**
 * Multipart forms send nested fields as JSON strings. This parses `data` (a JSON blob)
 * into req.body so the same Zod schema works for JSON and multipart requests.
 */
export const parseMultipartJson = (req, _res, next) => {
  if (typeof req.body?.data === 'string') {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      return next(ApiError.badRequest('Invalid data field'));
    }
  }
  next();
};
