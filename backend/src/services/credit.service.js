import mongoose from 'mongoose';
import { CreditWallet, ContactUnlock, Property, AuditLog, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getSetting } from './settings.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { rawContact } from './property.service.js';

/** Creates the wallet with the configured free credits on first access (idempotent via unique index). */
export async function getOrCreateWallet(userId, session) {
  const freeCredits = await getSetting('freeCredits');
  return CreditWallet.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, freeCredits, paidCredits: [] } },
    { upsert: true, new: true, session }
  );
}

export function summarize(wallet) {
  const now = Date.now();
  const active = (wallet?.paidCredits || [])
    .filter((b) => b.amount > 0 && new Date(b.expiresAt).getTime() > now)
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  const paid = active.reduce((s, b) => s + b.amount, 0);
  const free = wallet?.freeCredits || 0;
  return {
    free,
    paid,
    total: free + paid,
    nextExpiry: active[0]?.expiresAt || null,
    batches: active.map((b) => ({
      _id: b._id,
      amount: b.amount,
      initial: b.initial,
      expiresAt: b.expiresAt,
      source: b.source,
      order: b.order,
    })),
  };
}

export async function getBalance(userId) {
  return summarize(await getOrCreateWallet(userId));
}

/**
 * Spends one credit and records the unlock in a single transaction.
 * - Free credits first, then the paid batch that expires soonest.
 * - Conditional updates ($gt: 0) mean the balance can never go negative.
 * - The unique (user, property) index on ContactUnlock means parallel requests for the same
 *   property can't both charge: the loser's transaction aborts and is rolled back.
 */
export async function unlockContact(user, propertyId, ip) {
  const property = await Property.findById(propertyId).populate('owner', 'name phone whatsapp email');
  if (!property) throw ApiError.notFound('Property not found');
  if (String(property.owner?._id) === String(user._id)) {
    throw new ApiError(400, 'You cannot unlock your own listing', 'OWN_LISTING');
  }

  const existing = await ContactUnlock.findOne({ user: user._id, property: property._id });
  if (existing) {
    return {
      contact: rawContact(property),
      balance: await getBalance(user._id),
      alreadyUnlocked: true,
      creditType: existing.creditType,
    };
  }

  if (property.status !== 'approved') {
    throw new ApiError(400, 'This listing is not available for contact unlock', 'NOT_APPROVED');
  }

  await getOrCreateWallet(user._id);

  const session = await mongoose.startSession();
  let creditType;
  try {
    await session.withTransaction(async () => {
      creditType = null;
      const free = await CreditWallet.findOneAndUpdate(
        { user: user._id, freeCredits: { $gt: 0 } },
        { $inc: { freeCredits: -1 } },
        { session, new: true }
      );
      if (free) {
        creditType = 'free';
      } else {
        const wallet = await CreditWallet.findOne({ user: user._id }).session(session);
        const now = new Date();
        const batch = wallet?.paidCredits
          .filter((b) => b.amount > 0 && b.expiresAt > now)
          .sort((a, b) => a.expiresAt - b.expiresAt)[0];
        if (!batch) throw new ApiError(402, 'You have no credits left', 'NO_CREDITS');
        const res = await CreditWallet.updateOne(
          {
            _id: wallet._id,
            paidCredits: { $elemMatch: { _id: batch._id, amount: { $gt: 0 }, expiresAt: { $gt: now } } },
          },
          { $inc: { 'paidCredits.$.amount': -1 } },
          { session }
        );
        if (res.modifiedCount !== 1) throw new ApiError(409, 'Please retry', 'CREDIT_CONFLICT');
        creditType = 'paid';
      }
      await ContactUnlock.create([{ user: user._id, property: property._id, creditType, ip }], { session });
      await Property.updateOne({ _id: property._id }, { $inc: { unlockCount: 1 } }, { session });
    });
  } catch (e) {
    if (e?.code === 11000) {
      // A parallel request already unlocked it; this transaction was rolled back so nothing was charged.
      const prior = await ContactUnlock.findOne({ user: user._id, property: property._id });
      return {
        contact: rawContact(property),
        balance: await getBalance(user._id),
        alreadyUnlocked: true,
        creditType: prior?.creditType,
      };
    }
    throw e;
  } finally {
    await session.endSession();
  }

  flagBulkUnlocking(user, ip).catch(() => {});

  return {
    contact: rawContact(property),
    balance: await getBalance(user._id),
    alreadyUnlocked: false,
    creditType,
  };
}

async function flagBulkUnlocking(user, ip) {
  const since = new Date(Date.now() - 86400000);
  const count = await ContactUnlock.countDocuments({ user: user._id, createdAt: { $gte: since } });
  const limit = env.unlockSuspiciousPerDay;
  if (count >= limit && (count === limit || count % 10 === 0)) {
    logger.warn(`Suspicious bulk unlocking: user=${user._id} count24h=${count}`);
    await AuditLog.create({
      user: user._id,
      action: 'bulk_unlock',
      severity: count >= limit * 2 ? 'critical' : 'warning',
      meta: { count24h: count, email: user.email },
      ip,
    });
  }
}

/** Adds a paid batch to the wallet. Pass a session to join the caller's transaction. */
export async function addPaidCredits(userId, { amount, validityDays, orderId, source = 'purchase' }, session) {
  await getOrCreateWallet(userId, session);
  const expiresAt = new Date(Date.now() + validityDays * 86400000);
  await CreditWallet.updateOne(
    { user: userId },
    { $push: { paidCredits: { amount, initial: amount, expiresAt, order: orderId, source } } },
    { session }
  );
}

/** Admin grant (positive) or revoke (negative). Revokes never take the balance below zero. */
export async function adjustCredits(userId, { amount, kind, validityDays = 365 }, adminId, reason) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  const wallet = await getOrCreateWallet(userId);

  if (amount > 0) {
    if (kind === 'free') await CreditWallet.updateOne({ _id: wallet._id }, { $inc: { freeCredits: amount } });
    else await addPaidCredits(userId, { amount, validityDays, source: 'admin' });
  } else if (kind === 'free') {
    const n = Math.min(wallet.freeCredits, -amount);
    if (n > 0) {
      await CreditWallet.updateOne({ _id: wallet._id, freeCredits: { $gte: n } }, { $inc: { freeCredits: -n } });
    }
  } else {
    // Take from the batches that expire soonest first.
    let remaining = -amount;
    const fresh = await CreditWallet.findById(wallet._id);
    for (const b of [...fresh.paidCredits].sort((a, c) => a.expiresAt - c.expiresAt)) {
      if (remaining <= 0) break;
      const n = Math.min(b.amount, remaining);
      b.amount -= n;
      remaining -= n;
    }
    await fresh.save();
  }
  await AuditLog.create({
    user: userId,
    action: amount > 0 ? 'credits_granted' : 'credits_revoked',
    meta: { amount, kind, by: adminId, reason },
  });
  return getBalance(userId);
}

/** Removes whatever is left of the batch bought with this order (used on refund). */
export async function revokeOrderCredits(userId, orderId, session) {
  await CreditWallet.updateOne(
    { user: userId, 'paidCredits.order': orderId },
    { $set: { 'paidCredits.$.amount': 0 } },
    { session }
  );
}
