import { Router } from 'express';
import { profileSchema, changePasswordSchema } from '@propertyhub/shared';
import * as c from '../controllers/user.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.get('/me', requireAuth, h(c.me));
r.patch('/me', requireAuth, validate(profileSchema), h(c.updateMe));
r.post('/me/password', requireAuth, validate(changePasswordSchema), h(c.changePassword));
r.post('/me/avatar', requireAuth, upload.single('avatar'), h(c.uploadAvatar));
r.post('/me/push-token', requireAuth, h(c.registerPushToken));
r.post('/me/become-agent', requireAuth, h(c.becomeAgent));
r.get('/me/stats', requireAuth, requireRole('agent', 'admin'), h(c.myStats));
r.get('/agents/:id', optionalAuth, h(c.agentProfile));
export default r;
