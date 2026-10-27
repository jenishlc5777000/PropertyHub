import { Order, Plan } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/response.js';
import { isObjectId } from '../middleware/validate.js';
import * as payments from '../services/payment.service.js';
import { getBalance } from '../services/credit.service.js';
import { generateInvoicePdf } from '../services/invoice.service.js';
import { logger } from '../utils/logger.js';

export async function balance(req, res) {
  ok(res, await getBalance(req.user._id));
}

export async function plans(_req, res) {
  const items = await Plan.find({ active: true }).sort({ sortOrder: 1, price: 1 }).lean();
  ok(res, items);
}

export async function createOrder(req, res) {
  created(res, await payments.createOrder(req.user, req.body));
}

export async function verify(req, res) {
  const { order, alreadyProcessed } = await payments.verifyPayment(req.user, req.body);
  ok(res, {
    status: order.status,
    orderId: order._id,
    invoiceNo: order.invoiceNo,
    credits: order.credits,
    alreadyProcessed,
    balance: await getBalance(req.user._id),
  });
}

export async function failed(req, res) {
  if (!isObjectId(req.body?.orderId)) throw ApiError.badRequest('Invalid order');
  await payments.markFailed(req.user, req.body.orderId, req.body.reason);
  ok(res, { status: 'failed' });
}

/**
 * Razorpay webhook. Mounted with express.raw() so the signature is computed on the exact bytes.
 * Always answers 2xx for valid signatures so Razorpay doesn't retry forever on ignored events.
 */
export async function webhook(req, res) {
  const signature = req.get('x-razorpay-signature');
  const raw = req.body; // Buffer
  if (!Buffer.isBuffer(raw) || !payments.verifyWebhookSignature(raw, signature)) {
    logger.warn('Webhook rejected: bad signature');
    return res.status(400).json({ success: false, error: { code: 'BAD_SIGNATURE', message: 'Invalid signature' } });
  }
  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, error: { code: 'BAD_JSON', message: 'Invalid JSON' } });
  }
  try {
    const result = await payments.handleWebhook(event);
    ok(res, result);
  } catch (e) {
    if (e.code === 'DUPLICATE_PAYMENT' || e.code === 'ORDER_STATE') return ok(res, { ignored: true, reason: e.message });
    throw e; // 5xx makes Razorpay retry later
  }
}

export async function orders(req, res) {
  const items = await Order.find({ user: req.user._id, status: { $ne: 'created' } })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  ok(res, items);
}

export async function invoice(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Order not found');
  const filter = { _id: req.params.id, status: { $in: ['paid', 'refunded'] } };
  if (req.user.role !== 'admin') filter.user = req.user._id;
  const order = await Order.findOne(filter).populate('user', 'name email phone');
  if (!order) throw ApiError.notFound('Invoice not found');
  const pdf = await generateInvoicePdf(order, order.user);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${order.invoiceNo.replace(/\//g, '-')}.pdf"`);
  res.send(pdf);
}
