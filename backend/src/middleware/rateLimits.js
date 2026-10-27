import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const handler = (_req, res, _next, options) =>
  res.status(options.statusCode).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: options.message },
  });

const skip = () => env.isTest;

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many requests, please slow down.',
  handler,
  skip,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many attempts. Try again in 15 minutes.',
  handler,
  skip,
});

/** Per-user limit on contact unlocks to block scraping. */
export const unlockLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => env.unlockRatePerHour,
  keyGenerator: (req) => (req.user ? `u:${req.user._id}` : `ip:${req.ip}`),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'You are unlocking contacts too quickly. Please try again later.',
  handler,
  skip,
});

export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => (req.user ? `u:${req.user._id}` : `ip:${req.ip}`),
  message: 'Too many payment attempts. Please wait a few minutes.',
  handler,
  skip,
});
