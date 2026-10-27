import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openapi } from './config/swagger.js';
import routes from './routes/index.js';
import { webhook } from './controllers/payment.controller.js';
import { sitemap, robots } from './controllers/sitemap.controller.js';
import { notFound, errorHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimits.js';
import { asyncHandler } from './utils/asyncHandler.js';
import { UPLOAD_DIR } from './services/upload.service.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Render/Railway sit behind a proxy; needed for correct req.ip in rate limits

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, cb) {
        // Allow mobile apps / curl (no Origin) and configured web origins.
        if (!origin || env.corsOrigins.includes(origin) || (!env.isProd && /localhost|127\.0\.0\.1/.test(origin))) {
          return cb(null, true);
        }
        cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(compression());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Webhook needs the raw body for signature verification, so it is mounted before express.json().
  app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), asyncHandler(webhook));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(mongoSanitize()); // strips $ and . operators from user input (NoSQL injection)

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
  app.get('/sitemap.xml', asyncHandler(sitemap));
  app.get('/robots.txt', robots);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'PropertyHub API' }));
  app.get('/api/docs.json', (_req, res) => res.json(openapi));
  app.get('/', (_req, res) => res.json({ success: true, data: { name: 'PropertyHub API', docs: '/api/docs' } }));

  app.use('/api/v1', apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
