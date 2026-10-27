import { Router } from 'express';
import { visitSchema, visitStatusSchema } from '@propertyhub/shared';
import * as c from '../controllers/visit.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.use(requireAuth);
r.post('/', validate(visitSchema), h(c.create));
r.get('/', h(c.list));
r.patch('/:id', validate(visitStatusSchema), h(c.setStatus));
export default r;
