import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import propertyRoutes from './property.routes.js';
import favoriteRoutes from './favorite.routes.js';
import inquiryRoutes from './inquiry.routes.js';
import visitRoutes from './visit.routes.js';
import notificationRoutes from './notification.routes.js';
import creditRoutes from './credit.routes.js';
import paymentRoutes from './payment.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date() } }));
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/properties', propertyRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/visits', visitRoutes);
router.use('/notifications', notificationRoutes);
router.use('/', creditRoutes); // /credits/balance, /unlocked-contacts
router.use('/', paymentRoutes); // /plans, /payments/*
router.use('/admin', adminRoutes);

export default router;
