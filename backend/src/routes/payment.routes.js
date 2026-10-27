import { Router } from 'express';
import { createOrderSchema, verifyPaymentSchema } from '@propertyhub/shared';
import * as c from '../controllers/payment.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimits.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

// Note: POST /payments/webhook is mounted in app.js with express.raw() before the JSON parser.
const r = Router();
r.get('/plans', h(c.plans));
r.post('/payments/create-order', requireAuth, paymentLimiter, validate(createOrderSchema), h(c.createOrder));
r.post('/payments/verify', requireAuth, paymentLimiter, validate(verifyPaymentSchema), h(c.verify));
r.post('/payments/failed', requireAuth, h(c.failed));
r.get('/payments/orders', requireAuth, h(c.orders));
r.get('/payments/orders/:id/invoice', requireAuth, h(c.invoice));
export default r;
