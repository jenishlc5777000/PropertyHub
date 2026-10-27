import { Inquiry, Property } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/response.js';
import { isObjectId } from '../middleware/validate.js';
import { notify } from '../services/notification.service.js';

const populate = [
  { path: 'property', select: 'title slug images price purpose address.city address.locality' },
  { path: 'buyer', select: 'name avatar' },
  { path: 'agent', select: 'name avatar' },
];

const shape = (inq, userId) => {
  const o = inq.toObject();
  o.property = o.property && { ...o.property, image: o.property.images?.[0]?.url, images: undefined };
  o.role = String(o.buyer?._id) === String(userId) ? 'buyer' : 'agent';
  o.unread = String(o.unreadFor || '') === String(userId);
  o.lastMessage = o.messages?.[o.messages.length - 1];
  return o;
};

/** Starts (or continues) a thread between the buyer and the listing owner. */
export async function create(req, res) {
  const { propertyId, message } = req.body;
  if (!isObjectId(propertyId)) throw ApiError.notFound('Property not found');
  const property = await Property.findOne({ _id: propertyId, status: 'approved' });
  if (!property) throw ApiError.notFound('Property not found');
  if (String(property.owner) === String(req.user._id)) throw ApiError.badRequest('You cannot inquire on your own listing');

  const inquiry = await Inquiry.findOneAndUpdate(
    { property: property._id, buyer: req.user._id },
    {
      $setOnInsert: { property: property._id, buyer: req.user._id, agent: property.owner },
      $push: { messages: { sender: req.user._id, text: message } },
      $set: { lastMessageAt: new Date(), unreadFor: property.owner, status: 'open' },
    },
    { upsert: true, new: true }
  ).populate(populate);

  notify(property.owner, {
    type: 'inquiry',
    title: `New inquiry from ${req.user.name}`,
    body: `${property.title}: "${message.slice(0, 80)}"`,
    data: { inquiryId: String(inquiry._id) },
  });
  created(res, shape(inquiry, req.user._id));
}

export async function list(req, res) {
  const role = req.query.role;
  const filter =
    role === 'buyer'
      ? { buyer: req.user._id }
      : role === 'agent'
        ? { agent: req.user._id }
        : { $or: [{ buyer: req.user._id }, { agent: req.user._id }] };
  const items = await Inquiry.find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .populate(populate)
    .slice('messages', -1);
  ok(res, items.map((i) => shape(i, req.user._id)));
}

async function loadThread(req) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Inquiry not found');
  const inq = await Inquiry.findById(req.params.id).populate(populate);
  if (!inq) throw ApiError.notFound('Inquiry not found');
  const uid = String(req.user._id);
  if (String(inq.buyer._id) !== uid && String(inq.agent._id) !== uid && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  return inq;
}

export async function getOne(req, res) {
  const inq = await loadThread(req);
  if (String(inq.unreadFor || '') === String(req.user._id)) {
    inq.unreadFor = undefined;
    await inq.save();
  }
  ok(res, shape(inq, req.user._id));
}

export async function reply(req, res) {
  const inq = await loadThread(req);
  const uid = String(req.user._id);
  const other = String(inq.buyer._id) === uid ? inq.agent._id : inq.buyer._id;
  inq.messages.push({ sender: req.user._id, text: req.body.text });
  inq.lastMessageAt = new Date();
  inq.unreadFor = other;
  await inq.save();
  notify(other, {
    type: 'message',
    title: `New message from ${req.user.name}`,
    body: req.body.text.slice(0, 100),
    data: { inquiryId: String(inq._id) },
  });
  ok(res, shape(inq, req.user._id));
}
