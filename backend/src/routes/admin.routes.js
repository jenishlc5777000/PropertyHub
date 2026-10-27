import { Router } from 'express';
import { planSchema, grantCreditsSchema, promoSchema } from '@propertyhub/shared';
import * as c from '../controllers/admin.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.use(requireAuth, requireRole('admin'));

r.get('/stats', h(c.stats));
r.get('/revenue', h(c.revenue));

r.get('/properties', h(c.listProperties));
r.patch('/properties/:id/approve', h(c.approve));
r.patch('/properties/:id/reject', h(c.reject));
r.patch('/properties/:id/feature', h(c.feature));

r.get('/users', h(c.listUsers));
r.patch('/users/:id', h(c.updateUser));
r.post('/users/:id/credits', validate(grantCreditsSchema), h(c.grantCredits));

r.get('/plans', h(c.listPlans));
r.post('/plans', validate(planSchema), h(c.createPlan));
r.patch('/plans/:id', validate(planSchema.partial()), h(c.updatePlan));

r.get('/settings', h(c.getSettingsCtrl));
r.patch('/settings', h(c.updateSettingsCtrl));

r.get('/orders', h(c.listOrders));
r.post('/orders/:id/refund', h(c.refund));

r.get('/promos', h(c.listPromos));
r.post('/promos', validate(promoSchema), h(c.createPromo));
r.patch('/promos/:id', validate(promoSchema.partial()), h(c.updatePromo));

r.get('/audit/suspicious', h(c.suspicious));
export default r;
