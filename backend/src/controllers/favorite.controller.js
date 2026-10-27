import { Favorite, Property } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { isObjectId } from '../middleware/validate.js';
import { serializeMany, OWNER_FIELDS } from '../services/property.service.js';

export async function list(req, res) {
  const favs = await Favorite.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'property', populate: { path: 'owner', select: OWNER_FIELDS } });
  const props = favs.map((f) => f.property).filter(Boolean);
  const items = await serializeMany(props, req.user);
  ok(res, items.map((p) => ({ ...p, isFavorite: true })));
}

export async function ids(req, res) {
  const favs = await Favorite.find({ user: req.user._id }).select('property').lean();
  ok(res, favs.map((f) => String(f.property)));
}

export async function add(req, res) {
  const { propertyId } = req.params;
  if (!isObjectId(propertyId) || !(await Property.exists({ _id: propertyId }))) {
    throw ApiError.notFound('Property not found');
  }
  await Favorite.updateOne(
    { user: req.user._id, property: propertyId },
    { $setOnInsert: { user: req.user._id, property: propertyId } },
    { upsert: true }
  );
  ok(res, { propertyId, isFavorite: true });
}

export async function remove(req, res) {
  await Favorite.deleteOne({ user: req.user._id, property: req.params.propertyId });
  ok(res, { propertyId: req.params.propertyId, isFavorite: false });
}
