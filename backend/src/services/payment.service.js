import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { gstBreakdown } from '@propertyhub/shared';
import { env } from '../config/env.js';
import { Order, Plan, PromoCode, User, nextSeq, AuditLog } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { addPaidCredits, revokeOrderCredits } from './credit.service.js';
import { generateInvoicePdf } from './invoice.service.js';
import { sendMail, templates } from './email.service.js';
import { notify } from './notification.service.js';

/**
 * Mock mode lets you run the full purchase flow locally without Razorpay keys.
 * It is impossible to enable in production.
 */
export const isMockMode = () => !env.isProd && !(env.razorpay.keyId && env.razorpay.keySecret);

let rzp;
function razorpay() {
  if (!rzp) rzp = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  return rzp;
}

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

export function verifyCheckoutSignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret || !signature) return false;
  const expected = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

async function resolvePromo(code) {
  if (!code) return null;
  const promo = await PromoCode.findOne({ code: code.toUpperCase(), active: true });
  if (!promo || promo.expiresAt < new Date() || promo.used >= promo.maxUses) {
    throw new ApiError(400, 'Promo code is invalid or expired', 'INVALID_PROMO');
  }
  return promo;
}

/** Creates a Razorpay order. Price always comes from the Plan in the DB, never from the client. */
export async function createOrder(user, { planId, promoCode }) {
  const plan = await Plan.findOne({ _id: planId, active: true });
  if (!plan) throw ApiError.notFound('Plan not found');
  const promo = await resolvePromo(promoCode);

  const discount = promo ? Math.round(plan.price * promo.discountPct) / 100 : 0;
  const amount = Math.max(1, Math.round((plan.price - discount) * 100) / 100);
  const { base, gst } = gstBreakdown(amount);
  const receipt = `ph_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;

  let razorpayOrderId;
  if (isMockMode()) {
    razorpayOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
  } else {
    const rOrder = await razorpay().orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt,
      notes: { userId: String(user._id), planId: String(plan._id), credits: String(plan.credits) },
    });
    razorpayOrderId = rOrder.id;
  }

  const order = await Order.create({
    user: user._id,
    plan: plan._id,
    planName: plan.name,
    razorpayOrderId,
    amount,
    baseAmount: base,
    gstAmount: gst,
    discount,
    promoCode: promo?.code,
    credits: plan.credits,
    validityDays: plan.validityDays,
  });

  return {
    orderId: order._id,
    razorpayOrderId,
    amount,
    amountPaise: Math.round(amount * 100),
    currency: 'INR',
    keyId: isMockMode() ? 'mock' : env.razorpay.keyId,
    mock: isMockMode(),
    plan: { _id: plan._id, name: plan.name, credits: plan.credits, validityDays: plan.validityDays },
    prefill: { name: user.name, email: user.email, contact: user.phone },
  };
}

function financialYear(d = new Date()) {
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1; // FY runs April-March
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/**
 * Marks the order paid and adds credits exactly once. Shared by /verify and the webhook.
 * The status transition created|failed -> paid is a conditional update inside a transaction,
 * and paymentId has a unique index, so a payment can never be credited twice.
 */
export async function fulfillOrder(razorpayOrderId, paymentId, source) {
  const session = await mongoose.startSession();
  let order;
  let already = false;
  try {
    await session.withTransaction(async () => {
      already = false;
      order = await Order.findOneAndUpdate(
        { razorpayOrderId, status: { $in: ['created', 'failed'] } },
        { $set: { status: 'paid', paymentId, paidAt: new Date(), failureReason: null } },
        { new: true, session }
      );
      if (!order) {
        order = await Order.findOne({ razorpayOrderId }).session(session);
        if (!order) throw ApiError.notFound('Order not found');
        if (order.status === 'paid') {
          already = true;
          return;
        }
        throw new ApiError(409, `Order is ${order.status}`, 'ORDER_STATE');
      }
      const seq = await nextSeq(`invoice-${financialYear()}`, session);
      order.invoiceNo = `PH/${financialYear()}/${String(seq).padStart(6, '0')}`;
      await order.save({ session });
      await addPaidCredits(
        order.user,
        { amount: order.credits, validityDays: order.validityDays, orderId: order._id },
        session
      );
      if (order.promoCode) {
        await PromoCode.updateOne({ code: order.promoCode }, { $inc: { used: 1 } }, { session });
      }
    });
  } catch (e) {
    if (e?.code === 11000) {
      // paymentId already used on another order
      await AuditLog.create({
        action: 'duplicate_payment_id',
        severity: 'critical',
        meta: { razorpayOrderId, paymentId, source },
      });
      throw new ApiError(409, 'This payment was already processed', 'DUPLICATE_PAYMENT');
    }
    throw e;
  } finally {
    await session.endSession();
  }

  if (!already) {
    logger.info(`Order ${order.razorpayOrderId} paid via ${source}, +${order.credits} credits`);
    afterPayment(order).catch((e) => logger.warn('post-payment tasks failed', e.message));
  }
  return { order, alreadyProcessed: already };
}

async function afterPayment(order) {
  const user = await User.findById(order.user);
  if (!user) return;
  await notify(user._id, {
    type: 'payment',
    title: 'Payment successful',
    body: `${order.credits} contact credits added to your wallet.`,
    data: { orderId: String(order._id) },
  });
  const pdf = await generateInvoicePdf(order, user);
  const t = templates.invoice(user.name, order);
  await sendMail({
    to: user.email,
    ...t,
    attachments: [{ filename: `${order.invoiceNo.replace(/\//g, '-')}.pdf`, content: pdf }],
  });
}

export async function verifyPayment(user, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: user._id });
  if (!order) throw ApiError.notFound('Order not found');

  const valid = isMockMode()
    ? razorpay_signature === 'mock' && razorpay_payment_id.startsWith('pay_mock_')
    : verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    await AuditLog.create({
      user: user._id,
      action: 'bad_payment_signature',
      severity: 'warning',
      meta: { razorpay_order_id, razorpay_payment_id },
    });
    throw new ApiError(400, 'Payment verification failed', 'BAD_SIGNATURE');
  }
  return fulfillOrder(razorpay_order_id, razorpay_payment_id, 'verify');
}

export async function markFailed(user, orderId, reason) {
  await Order.updateOne(
    { _id: orderId, user: user._id, status: 'created' },
    { $set: { status: 'failed', failureReason: String(reason || 'Payment failed').slice(0, 200) } }
  );
}

/** Razorpay webhook. Must be idempotent: Razorpay retries deliveries. */
export async function handleWebhook(event) {
  const payment = event?.payload?.payment?.entity;
  switch (event?.event) {
    case 'payment.captured':
    case 'order.paid': {
      if (!payment?.order_id) return { ignored: true };
      const order = await Order.findOne({ razorpayOrderId: payment.order_id });
      if (!order) return { ignored: true, reason: 'unknown order' };
      if (payment.amount !== Math.round(order.amount * 100)) {
        await AuditLog.create({
          action: 'payment_amount_mismatch',
          severity: 'critical',
          meta: { order: order._id, expected: order.amount * 100, got: payment.amount },
        });
        return { ignored: true, reason: 'amount mismatch' };
      }
      const r = await fulfillOrder(payment.order_id, payment.id, 'webhook');
      return { processed: true, alreadyProcessed: r.alreadyProcessed };
    }
    case 'payment.failed': {
      if (!payment?.order_id) return { ignored: true };
      await Order.updateOne(
        { razorpayOrderId: payment.order_id, status: 'created' },
        { $set: { status: 'failed', failureReason: payment.error_description || 'Payment failed' } }
      );
      return { processed: true };
    }
    default:
      return { ignored: true };
  }
}

export async function refundOrder(orderId, adminId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== 'paid') throw ApiError.badRequest('Only paid orders can be refunded');

  let refundId = `rfnd_mock_${crypto.randomBytes(6).toString('hex')}`;
  if (!isMockMode() && !order.paymentId.startsWith('pay_mock_')) {
    const refund = await razorpay().payments.refund(order.paymentId, {
      amount: Math.round(order.amount * 100),
      notes: { orderId: String(order._id) },
    });
    refundId = refund.id;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await Order.updateOne(
        { _id: order._id, status: 'paid' },
        { $set: { status: 'refunded', refundId, refundedAt: new Date() } },
        { session }
      );
      if (updated.modifiedCount !== 1) throw ApiError.conflict('Order already refunded');
      await revokeOrderCredits(order.user, order._id, session);
    });
  } finally {
    await session.endSession();
  }
  await AuditLog.create({ user: order.user, action: 'order_refunded', meta: { order: order._id, by: adminId } });
  await notify(order.user, {
    type: 'payment',
    title: 'Refund processed',
    body: `Your payment of Rs ${order.amount} has been refunded. Unused credits from this order were removed.`,
  });
  return Order.findById(order._id);
}
