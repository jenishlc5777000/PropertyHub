import { Router } from 'express';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@propertyhub/shared';
import * as c from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimits.js';
import { asyncHandler as h } from '../utils/asyncHandler.js';

const r = Router();
r.post('/register', authLimiter, validate(registerSchema), h(c.register));
r.post('/login', authLimiter, validate(loginSchema), h(c.login));
r.post('/refresh', h(c.refresh));
r.post('/logout', h(c.logout));
r.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), h(c.forgotPassword));
r.post('/reset-password', authLimiter, validate(resetPasswordSchema), h(c.resetPassword));
export default r;
