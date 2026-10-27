import { Visit, Property } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/response.js';
import { isObjectId } from '../middleware/validate.js';
import { notify } from '../services/notification.service.js';

const populate = [
  { path: 'property', select: 'title slug images address.city address.locality' },
  { path: 'buyer', select: 'name avatar' },
  { path: 'agent', select: 'name avatar' },
];

export async function create(req, res) {
  const { propertyId, date, slot, note } = req.body;
  if (!isObjectId(propertyId)) throw ApiError.notFound('Property not found');
  const property = await Property.findOne({ _id: propertyId, status: 'approved' });
  if (!property) throw ApiError.notFound('Property not found');
  if (String(property.owner) === String(req.user._id)) throw ApiError.badRequest('This is your own listing');

  const dup = await Visit.exists({
    property: property._id,
    buyer: req.user._id,
    status: { $in: ['requested', 'confirmed'] },
  });
  if (dup) throw ApiError.conflict('You already have a visit scheduled for this property', 'VISIT_EXISTS');

  const visit = await Visit.create({ property: property._id, buyer: req.user._id, agent: property.owner, date, slot, note });
  notify(property.owner, {
    type: 'visit',
    title: 'New visit request',
    body: `${req.user.name} wants to visit "${property.title}" on ${new Date(date).toDateString()} (${slot})`,
    data: { visitId: String(visit._id) },
  });
  await visit.populate(populate);
  created(res, visit);
}

export async function list(req, res) {
  const filter =
    req.query.role === 'agent'
      ? { agent: req.user._id }
      : req.query.role === 'buyer'
        ? { buyer: req.user._id }
        : { $or: [{ buyer: req.user._id }, { agent: req.user._id }] };
  const items = await Visit.find(filter).sort({ date: 1 }).limit(100).populate(populate);
  ok(res, items);
}

export async function setStatus(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Visit not found');
  const visit = await Visit.findById(req.params.id).populate(populate);
  if (!visit) throw ApiError.notFound('Visit not found');
  const uid = String(req.user._id);
  const isAgent = String(visit.agent._id) === uid;
  const isBuyer = String(visit.buyer._id) === uid;
  const { status } = req.body;
  // Agents can confirm/cancel/complete; buyers can only cancel.
  if (!(isAgent || (isBuyer && status === 'cancelled'))) throw ApiError.forbidden();
  visit.status = status;
  await visit.save();
  notify(isAgent ? visit.buyer._id : visit.agent._id, {
    type: 'visit',
    title: `Visit ${status}`,
    body: `${visit.property?.title} on ${visit.date.toDateString()}`,
    data: { visitId: String(visit._id) },
  });
  ok(res, visit);
}
