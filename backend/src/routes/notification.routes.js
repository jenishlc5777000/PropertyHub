import { Router } from 'express';
import * as c from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.use(requireAuth);
r.get('/', h(c.list));
r.patch('/read-all', h(c.markAllRead));
r.patch('/:id/read', h(c.markRead));
export default r;
