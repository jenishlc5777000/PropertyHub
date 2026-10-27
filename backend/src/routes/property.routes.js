import { Router } from 'express';
import { propertySchema, propertyUpdateSchema, propertyFilterSchema, nearSchema, MAX_IMAGES } from '@propertyhub/shared';
import * as c from '../controllers/property.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js';
import { upload, parseMultipartJson } from '../middleware/upload.js';
import { unlockLimiter } from '../middleware/rateLimits.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.get('/', optionalAuth, validate(propertyFilterSchema, 'query'), h(c.list));
r.get('/near', optionalAuth, validate(nearSchema, 'query'), h(c.near));
r.get('/featured', optionalAuth, h(c.featured));
r.get('/mine', requireAuth, h(c.mine));
r.post(
  '/',
  requireAuth,
  requireRole('agent', 'admin'),
  upload.array('images', MAX_IMAGES),
  parseMultipartJson,
  validate(propertySchema),
  h(c.create)
);
r.get('/:idOrSlug', optionalAuth, h(c.getOne));
r.get('/:id/similar', optionalAuth, h(c.similar));
r.patch(
  '/:id',
  requireAuth,
  upload.array('images', MAX_IMAGES),
  parseMultipartJson,
  validate(propertyUpdateSchema),
  h(c.update)
);
r.delete('/:id', requireAuth, h(c.remove));
r.patch('/:id/status', requireAuth, h(c.setStatus));
r.post('/:id/unlock-contact', requireAuth, unlockLimiter, h(c.unlockContact));
export default r;
