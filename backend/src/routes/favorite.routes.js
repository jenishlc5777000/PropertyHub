import { Router } from 'express';
import * as c from '../controllers/favorite.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.use(requireAuth);
r.get('/', h(c.list));
r.get('/ids', h(c.ids));
r.post('/:propertyId', h(c.add));
r.delete('/:propertyId', h(c.remove));
export default r;
