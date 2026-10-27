import { User, Property, Order, ContactUnlock, Plan, PromoCode, AuditLog, Inquiry, CreditWallet } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created, paginate } from '../utils/response.js';
import { isObjectId } from '../middleware/validate.js';
import { serializeMany, serializeProperty, OWNER_FIELDS } from '../services/property.service.js';
import { notify } from '../services/notification.service.js';
import { adjustCredits, summarize } from '../services/credit.service.js';
import { refundOrder } from '../services/payment.service.js';
import { getSettings, updateSettings } from '../services/settings.service.js';

const pageParams = (q) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Number(q.limit) || 20);
  return { page, limit, skip: (page - 1) * limit };
};
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function stats(_req, res) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [users, agents, byStatus, revenueAgg, todayUnlocks, inquiries] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'agent' }),
    Property.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, gst: { $sum: '$gstAmount' }, orders: { $sum: 1 } } },
    ]),
    ContactUnlock.countDocuments({ createdAt: { $gte: today } }),
    Inquiry.countDocuments(),
  ]);
  ok(res, {
    users,
    agents,
    properties: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    revenue: revenueAgg[0]?.total || 0,
    gstCollected: revenueAgg[0]?.gst || 0,
    paidOrders: revenueAgg[0]?.orders || 0,
    unlocksToday: todayUnlocks,
    inquiries,
  });
}

/** Daily sales, orders and unlocks for the last N days, plus top properties by unlocks. */
export async function revenue(req, res) {
  const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 86400000);
  const tz = 'Asia/Kolkata';
  const [sales, unlocks, top] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: tz } },
          amount: { $sum: '$amount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ContactUnlock.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
          unlocks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Property.find({ unlockCount: { $gt: 0 } })
      .sort({ unlockCount: -1 })
      .limit(10)
      .select('title slug unlockCount views address.city price purpose')
      .lean(),
  ]);

  // Fill gaps so charts get a continuous series.
  const s = Object.fromEntries(sales.map((r) => [r._id, r]));
  const u = Object.fromEntries(unlocks.map((r) => [r._id, r.unlocks]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toLocaleDateString('en-CA', { timeZone: tz });
    series.push({ date: d, amount: s[d]?.amount || 0, orders: s[d]?.orders || 0, unlocks: u[d] || 0 });
  }
  ok(res, {
    days,
    series,
    totals: series.reduce(
      (t, r) => ({ amount: t.amount + r.amount, orders: t.orders + r.orders, unlocks: t.unlocks + r.unlocks }),
      { amount: 0, orders: 0, unlocks: 0 }
    ),
    topProperties: top,
  });
}

export async function listProperties(req, res) {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.featured === 'true') filter.featured = true;
  if (req.query.q) filter.title = new RegExp(escapeRegex(String(req.query.q)), 'i');
  const [items, total] = await Promise.all([
    Property.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('owner', OWNER_FIELDS),
    Property.countDocuments(filter),
  ]);
  ok(res, await serializeMany(items, req.user), paginate(page, limit, total));
}

async function loadProperty(id) {
  if (!isObjectId(id)) throw ApiError.notFound('Property not found');
  const p = await Property.findById(id).populate('owner', OWNER_FIELDS);
  if (!p) throw ApiError.notFound('Property not found');
  return p;
}

export async function approve(req, res) {
  const p = await loadProperty(req.params.id);
  p.status = 'approved';
  p.rejectionReason = undefined;
  p.approvedAt = p.approvedAt || new Date();
  await p.save();
  notify(p.owner._id, {
    type: 'listing',
    title: 'Your listing is live!',
    body: `"${p.title}" has been approved and is now visible to buyers.`,
    data: { propertyId: String(p._id), slug: p.slug },
  });
  ok(res, serializeProperty(p, req.user));
}

export async function reject(req, res) {
  const p = await loadProperty(req.params.id);
  p.status = 'rejected';
  p.rejectionReason = String(req.body?.reason || 'Does not meet listing guidelines').slice(0, 300);
  p.featured = false;
  await p.save();
  notify(p.owner._id, {
    type: 'listing',
    title: 'Listing not approved',
    body: `"${p.title}": ${p.rejectionReason}`,
    data: { propertyId: String(p._id) },
  });
  ok(res, serializeProperty(p, req.user));
}

export async function feature(req, res) {
  const p = await loadProperty(req.params.id);
  if (p.status !== 'approved' && req.body?.featured) throw ApiError.badRequest('Only approved listings can be featured');
  p.featured = Boolean(req.body?.featured);
  await p.save();
  ok(res, serializeProperty(p, req.user));
}

export async function listUsers(req, res) {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.role) filter.role = String(req.query.role);
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  const wallets = await CreditWallet.find({ user: { $in: users.map((u) => u._id) } });
  const wmap = Object.fromEntries(wallets.map((w) => [String(w.user), summarize(w)]));
  const items = users.map((u) => ({
    ...u.toSelf(),
    isActive: u.isActive,
    credits: wmap[String(u._id)] || { free: 0, paid: 0, total: 0 },
  }));
  ok(res, items, paginate(page, limit, total));
}

export async function updateUser(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('User not found');
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot modify your own admin account here');
  const patch = {};
  if (['buyer', 'agent', 'admin'].includes(req.body?.role)) patch.role = req.body.role;
  if (typeof req.body?.isActive === 'boolean') patch.isActive = req.body.isActive;
  const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  await AuditLog.create({ user: user._id, action: 'user_updated', meta: { patch, by: req.user._id } });
  ok(res, { ...user.toSelf(), isActive: user.isActive });
}

export async function grantCredits(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('User not found');
  const balance = await adjustCredits(req.params.id, req.body, req.user._id, req.body.reason);
  if (req.body.amount > 0) {
    notify(req.params.id, {
      type: 'credits',
      title: 'Credits added',
      body: `${req.body.amount} contact credits were added to your wallet.`,
    });
  }
  ok(res, balance);
}

export async function listPlans(_req, res) {
  ok(res, await Plan.find().sort({ sortOrder: 1, price: 1 }));
}

export async function createPlan(req, res) {
  created(res, await Plan.create(req.body));
}

export async function updatePlan(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Plan not found');
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!plan) throw ApiError.notFound('Plan not found');
  ok(res, plan);
}

export async function getSettingsCtrl(_req, res) {
  ok(res, await getSettings());
}

export async function updateSettingsCtrl(req, res) {
  const fc = Number(req.body?.freeCredits);
  if (!Number.isInteger(fc) || fc < 0 || fc > 1000) throw ApiError.badRequest('freeCredits must be 0-1000');
  ok(res, await updateSettings({ freeCredits: fc }));
}

export async function listOrders(req, res) {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email phone').lean(),
    Order.countDocuments(filter),
  ]);
  ok(res, items, paginate(page, limit, total));
}

export async function refund(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Order not found');
  ok(res, await refundOrder(req.params.id, req.user._id));
}

export async function listPromos(_req, res) {
  ok(res, await PromoCode.find().sort({ createdAt: -1 }));
}

export async function createPromo(req, res) {
  created(res, await PromoCode.create(req.body));
}

export async function updatePromo(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Promo not found');
  const promo = await PromoCode.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!promo) throw ApiError.notFound('Promo not found');
  ok(res, promo);
}

export async function suspicious(_req, res) {
  const items = await AuditLog.find({ severity: { $in: ['warning', 'critical'] } })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('user', 'name email')
    .lean();
  ok(res, items);
}
