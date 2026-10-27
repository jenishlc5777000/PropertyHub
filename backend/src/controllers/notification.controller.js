import { Notification } from '../models/index.js';
import { ok } from '../utils/response.js';

export async function list(req, res) {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  ok(res, { items, unread });
}

export async function markRead(req, res) {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  ok(res, { read: true });
}

export async function markAllRead(req, res) {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  ok(res, { read: true });
}
