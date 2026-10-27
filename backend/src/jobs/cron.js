import cron from 'node-cron';
import { CreditWallet } from '../models/index.js';
import { notify } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

/** Warn users 7 days before a paid credit batch expires (once per batch). */
export async function warnExpiringCredits() {
  const now = new Date();
  const soon = new Date(Date.now() + 7 * 86400000);
  const wallets = await CreditWallet.find({
    paidCredits: { $elemMatch: { amount: { $gt: 0 }, warned: false, expiresAt: { $gt: now, $lte: soon } } },
  });
  for (const w of wallets) {
    const batches = w.paidCredits.filter((b) => b.amount > 0 && !b.warned && b.expiresAt > now && b.expiresAt <= soon);
    const total = batches.reduce((s, b) => s + b.amount, 0);
    const first = batches.sort((a, b) => a.expiresAt - b.expiresAt)[0];
    await notify(w.user, {
      type: 'credits',
      title: 'Credits expiring soon',
      body: `${total} paid credits expire on ${first.expiresAt.toDateString()}. Use them before they lapse!`,
    });
    batches.forEach((b) => (b.warned = true));
    await w.save();
  }
  if (wallets.length) logger.info(`Credit expiry warnings sent: ${wallets.length}`);
}

export function startJobs() {
  // 10:00 IST daily
  cron.schedule('0 10 * * *', () => warnExpiringCredits().catch((e) => logger.error('cron', e)), {
    timezone: 'Asia/Kolkata',
  });
}
