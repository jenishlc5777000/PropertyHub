import 'dotenv/config';

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));
const isProd = process.env.NODE_ENV === 'production';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: num(process.env.PORT, 5000),
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  webUrl: process.env.WEB_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI || 'memory',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshDays: num(process.env.JWT_REFRESH_DAYS, 30),
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: num(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'PropertyHub <no-reply@propertyhub.in>',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  company: {
    name: process.env.COMPANY_NAME || 'PropertyHub Technologies Pvt Ltd',
    address: process.env.COMPANY_ADDRESS || 'Bengaluru, Karnataka, India',
    gstin: process.env.COMPANY_GSTIN || '',
  },
  defaultFreeCredits: num(process.env.DEFAULT_FREE_CREDITS, 7),
  unlockRatePerHour: num(process.env.UNLOCK_RATE_PER_HOUR, 20),
  unlockSuspiciousPerDay: num(process.env.UNLOCK_SUSPICIOUS_PER_DAY, 30),
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@propertyhub.in',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
};

if (isProd) {
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI']) {
    if (!process.env[key]) throw new Error(`Missing required env var ${key}`);
  }
  if (env.mongoUri === 'memory') throw new Error('MONGODB_URI=memory is not allowed in production');
}
