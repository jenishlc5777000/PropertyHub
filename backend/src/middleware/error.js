import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) => next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));

export const errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof multer.MulterError) {
    status = 400;
    code = 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 5 MB' : err.message;
  } else if (err.name === 'ValidationError') {
    status = 400;
    code = 'BAD_REQUEST';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'BAD_REQUEST';
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(', ') || 'field'}`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'BAD_JSON';
    message = 'Malformed JSON body';
  }

  if (!(err instanceof ApiError) && status >= 500) {
    logger.error(err);
    if (env.isProd) message = 'Internal server error';
  }

  res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
};
