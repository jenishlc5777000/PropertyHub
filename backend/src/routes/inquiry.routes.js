import { Router } from 'express';
import { inquirySchema, messageSchema } from '@propertyhub/shared';
import * as c from '../controllers/inquiry.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.use(requireAuth);
r.post('/', validate(inquirySchema), h(c.create));
r.get('/', h(c.list));
r.get('/:id', h(c.getOne));
r.post('/:id/messages', validate(messageSchema), h(c.reply));
export default r;
