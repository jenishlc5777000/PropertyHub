import { Router } from 'express';
import { balance } from '../controllers/payment.controller.js';
import { unlockedContacts } from '../controllers/property.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.get('/credits/balance', requireAuth, h(balance));
r.get('/unlocked-contacts', requireAuth, h(unlockedContacts));
export default r;
