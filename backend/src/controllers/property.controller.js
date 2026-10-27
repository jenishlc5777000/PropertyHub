import crypto from 'node:crypto';
import { slugify, formatINR, distanceKm, MAX_IMAGES } from '@propertyhub/shared';
import { Property, Favorite, User, Visit, ContactUnlock } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created, paginate } from '../utils/response.js';
import { isObjectId } from '../middleware/validate.js';
import { uploadImage, deleteImage } from '../services/upload.service.js';
import { serializeMany, serializeProperty, unlockedSetFor, OWNER_FIELDS } from '../services/property.service.js';
import { unlockContact as unlockService } from '../services/credit.service.js';
import { notify } from '../services/notification.service.js';
import { getActiveCities, publicPropertyFilter } from '../services/settings.service.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORT = { newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 } };

async function buildFilter(q) {
  const filter = await publicPropertyFilter();
  if (q.q) filter.$text = { $search: q.q };
  // A city filter can only narrow within live cities, never widen.
  if (q.city) filter['address.city'] = { $in: filter['address.city'].$in.filter((c) => c.toLowerCase() === q.city.toLowerCase()) };
  if (q.locality) filter['address.locality'] = new RegExp(escapeRegex(q.locality), 'i');
  if (q.type) filter.type = q.type;
  if (q.purpose) filter.purpose = q.purpose;
  if (q.furnishing) filter.furnishing = q.furnishing;
  if (q.minPrice != null || q.maxPrice != null) {
    filter.price = {};
    if (q.minPrice != null) filter.price.$gte = q.minPrice;
    if (q.maxPrice != null) filter.price.$lte = q.maxPrice;
  }
  if (q.beds != null) filter.bedrooms = q.beds >= 4 ? { $gte: 4 } : q.beds;
  if (q.amenities?.length) filter.amenities = { $all: q.amenities };
  return filter;
}

export async function list(req, res) {
  const q = req.validQuery;
  const filter = await buildFilter(q);
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Property.find(filter)
      .sort(q.boost === '1' ? { featured: -1, ...SORT[q.sort] } : SORT[q.sort])
      .skip(skip)
      .limit(q.limit)
      .populate('owner', OWNER_FIELDS),
    Property.countDocuments(filter),
  ]);
  ok(res, await serializeMany(items, req.user), paginate(q.page, q.limit, total));
}

export async function near(req, res) {
  const { lat, lng, radiusKm, purpose, type, minPrice, maxPrice, beds, limit } = req.validQuery;
  // $nearSphere returns results sorted nearest-first.
  const filter = await publicPropertyFilter({
    location: {
      $nearSphere: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: radiusKm * 1000 },
    },
  });
  if (purpose) filter.purpose = purpose;
  if (type) filter.type = type;
  if (beds != null) filter.bedrooms = beds >= 4 ? { $gte: 4 } : beds;
  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null) filter.price.$gte = minPrice;
    if (maxPrice != null) filter.price.$lte = maxPrice;
  }
  const items = await Property.find(filter).limit(limit).populate('owner', OWNER_FIELDS);
  const out = await serializeMany(items, req.user);
  ok(
    res,
    out.map((p) => ({ ...p, distanceKm: distanceKm(lat, lng, p.lat, p.lng) }))
  );
}

export async function featured(req, res) {
  const items = await Property.find(await publicPropertyFilter({ featured: true }))
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('owner', OWNER_FIELDS);
  ok(res, await serializeMany(items, req.user));
}

async function findByIdOrSlug(idOrSlug) {
  const query = isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  return Property.findOne(query).populate('owner', OWNER_FIELDS);
}

export async function getOne(req, res) {
  const p = await findByIdOrSlug(req.params.idOrSlug);
  if (!p) throw ApiError.notFound('Property not found');
  const isOwner = req.user && String(p.owner?._id) === String(req.user._id);
  const isAdmin = req.user?.role === 'admin';
  const visible = ['approved', 'sold', 'rented'].includes(p.status) && (await getActiveCities()).includes(p.address.city);
  if (!visible && !isOwner && !isAdmin) throw ApiError.notFound('Property not found');
  if (!isOwner) Property.updateOne({ _id: p._id }, { $inc: { views: 1 } }).exec();
  const unlocked = await unlockedSetFor(req.user, [p._id]);
  const data = serializeProperty(p, req.user, unlocked);
  if (req.user) data.isFavorite = Boolean(await Favorite.exists({ user: req.user._id, property: p._id }));
  ok(res, data);
}

export async function similar(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound();
  const p = await Property.findById(req.params.id).lean();
  if (!p) throw ApiError.notFound('Property not found');
  // Same purpose and a similar budget, nearest first (within 10 km).
  const [lng, lat] = p.location.coordinates;
  const items = await Property.find(
    await publicPropertyFilter({
      _id: { $ne: p._id },
      purpose: p.purpose,
      price: { $gte: p.price * 0.5, $lte: p.price * 1.5 },
      location: { $nearSphere: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 10000 } },
    })
  )
    .limit(6)
    .populate('owner', OWNER_FIELDS);
  const out = await serializeMany(items, req.user);
  ok(res, out.map((s) => ({ ...s, distanceKm: distanceKm(lat, lng, s.lat, s.lng) })));
}

export async function mine(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const filter = { owner: req.user._id };
  if (req.query.status) filter.status = String(req.query.status);
  const [items, total] = await Promise.all([
    Property.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('owner', OWNER_FIELDS),
    Property.countDocuments(filter),
  ]);
  ok(res, await serializeMany(items, req.user), paginate(page, limit, total));
}

function toDoc(body) {
  const { lat, lng, contactPhone, contactWhatsapp, contactEmail, ...rest } = body;
  const doc = { ...rest };
  if (lat != null && lng != null) doc.location = { type: 'Point', coordinates: [lng, lat] };
  if (contactPhone !== undefined || contactWhatsapp !== undefined || contactEmail !== undefined) {
    doc.contact = { phone: contactPhone || undefined, whatsapp: contactWhatsapp || undefined, email: contactEmail || undefined };
  }
  return doc;
}

async function assertCityServed(city) {
  const active = await getActiveCities();
  if (city && !active.includes(city)) {
    throw new ApiError(400, `We currently accept listings only in ${active.join(', ')}.`, 'CITY_NOT_SERVED', { 'address.city': `Only ${active.join(', ')} for now` });
  }
}

export async function create(req, res) {
  await assertCityServed(req.body.address?.city);
  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('Add at least one photo');
  const images = await Promise.all(files.slice(0, MAX_IMAGES).map((f) => uploadImage(f.buffer)));
  const doc = toDoc(req.body);
  const property = await Property.create({
    ...doc,
    images,
    owner: req.user._id,
    slug: `${slugify(`${req.body.title} ${req.body.address.locality} ${req.body.address.city}`)}-${crypto.randomBytes(3).toString('hex')}`,
    status: req.user.role === 'admin' ? 'approved' : 'pending',
    approvedAt: req.user.role === 'admin' ? new Date() : undefined,
  });
  if (property.status === 'pending') notifyAdminsForReview(property, 'New listing awaiting approval');
  await property.populate('owner', OWNER_FIELDS);
  created(res, serializeProperty(property, req.user));
}

async function notifyAdminsForReview(property, title) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
  admins.forEach((a) =>
    notify(a._id, { type: 'listing', title, body: property.title, data: { propertyId: String(property._id), review: true } })
  );
}

async function loadOwned(req) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Property not found');
  const p = await Property.findById(req.params.id);
  if (!p) throw ApiError.notFound('Property not found');
  if (String(p.owner) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.forbidden();
  return p;
}

const MODERATED_FIELDS = ['title', 'description', 'type', 'purpose', 'address', 'location', 'images'];

export async function update(req, res) {
  const p = await loadOwned(req);
  const { removeImages = [], ...body } = req.body;
  if (body.address?.city && body.address.city !== p.address.city) await assertCityServed(body.address.city);
  const doc = toDoc(body);
  const oldPrice = p.price;

  let images = p.images.filter((img) => !removeImages.includes(img.url));
  const removed = p.images.filter((img) => removeImages.includes(img.url));
  const files = req.files || [];
  if (images.length + files.length > MAX_IMAGES) throw ApiError.badRequest(`Maximum ${MAX_IMAGES} photos allowed`);
  if (files.length) images = images.concat(await Promise.all(files.map((f) => uploadImage(f.buffer))));
  if (!images.length) throw ApiError.badRequest('A listing needs at least one photo');

  // Forms send every field on save, so compare values: only real content changes go back to review.
  const before = p.toObject();
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const contentChanged = MODERATED_FIELDS.some((f) => {
    if (!(f in doc) || f === 'images') return false;
    if (f === 'address') return Object.keys(doc.address).some((k) => !same(doc.address[k], before.address?.[k]));
    if (f === 'location') return !same(doc.location.coordinates, before.location?.coordinates);
    return !same(doc[f], before[f]);
  });
  const needsReview =
    req.user.role !== 'admin' &&
    (p.status === 'rejected' || (p.status === 'approved' && (files.length > 0 || removed.length > 0 || contentChanged)));

  if (doc.price != null && doc.price < oldPrice) doc.previousPrice = oldPrice;
  Object.assign(p, doc, { images });
  if (needsReview) {
    p.status = 'pending';
    p.rejectionReason = undefined;
  }
  await p.save();
  if (needsReview) notifyAdminsForReview(p, 'Edited listing awaiting re-approval');
  removed.forEach((img) => deleteImage(img.publicId));

  if (doc.price != null && doc.price < oldPrice && p.status === 'approved') notifyPriceDrop(p, oldPrice);

  await p.populate('owner', OWNER_FIELDS);
  ok(res, serializeProperty(p, req.user));
}

async function notifyPriceDrop(p, oldPrice) {
  const favs = await Favorite.find({ property: p._id }).select('user').lean();
  for (const f of favs) {
    notify(f.user, {
      type: 'price_drop',
      title: 'Price drop on a saved property',
      body: `${p.title}: ${formatINR(oldPrice)} → ${formatINR(p.price)}`,
      data: { propertyId: String(p._id), slug: p.slug },
    });
  }
}

export async function remove(req, res) {
  const p = await loadOwned(req);
  await Promise.all([
    Property.deleteOne({ _id: p._id }),
    Favorite.deleteMany({ property: p._id }),
    Visit.deleteMany({ property: p._id, status: 'requested' }),
  ]);
  // Unlock and inquiry history is kept for buyers' records and billing disputes.
  p.images.forEach((img) => deleteImage(img.publicId));
  ok(res, { deleted: true });
}

export async function setStatus(req, res) {
  const p = await loadOwned(req);
  const { status } = req.body || {};
  const allowed = { approved: ['sold', 'rented'], sold: ['approved'], rented: ['approved'] };
  if (!allowed[p.status]?.includes(status)) {
    throw ApiError.badRequest(`Cannot change status from ${p.status} to ${status}`);
  }
  p.status = status;
  await p.save();
  ok(res, { _id: p._id, status: p.status });
}

export async function unlockContact(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Property not found');
  const result = await unlockService(req.user, req.params.id, req.ip);
  ok(res, result);
}

export async function unlockedContacts(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const [rows, total] = await Promise.all([
    ContactUnlock.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'property', populate: { path: 'owner', select: OWNER_FIELDS } }),
    ContactUnlock.countDocuments({ user: req.user._id }),
  ]);
  const set = new Set(rows.map((r) => String(r.property?._id)));
  const items = rows.map((r) => ({
    _id: r._id,
    unlockedAt: r.createdAt,
    creditType: r.creditType,
    property: r.property ? serializeProperty(r.property, req.user, set) : null,
  }));
  ok(res, items, paginate(page, limit, total));
}

