import { User, Property, Inquiry, Visit, ContactUnlock, Favorite } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { uploadImage, deleteImage } from '../services/upload.service.js';
import { serializeMany, OWNER_FIELDS } from '../services/property.service.js';
import { isObjectId } from '../middleware/validate.js';

export async function me(req, res) {
  ok(res, req.user.toSelf());
}

export async function updateMe(req, res) {
  Object.assign(req.user, req.body);
  await req.user.save();
  ok(res, req.user.toSelf());
}

/** Lets a buyer start posting listings. Never grants admin. */
export async function becomeAgent(req, res) {
  if (req.user.role === 'buyer') {
    req.user.role = 'agent';
    await req.user.save();
  }
  ok(res, req.user.toSelf());
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.checkPassword(req.body.currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect', 'INVALID_CREDENTIALS');
  }
  await user.setPassword(req.body.newPassword);
  await user.save();
  ok(res, { message: 'Password changed' });
}

export async function uploadAvatar(req, res) {
  if (!req.file) throw ApiError.badRequest('No image uploaded');
  const img = await uploadImage(req.file.buffer, 'avatars');
  await deleteImage(req.user.avatar?.publicId);
  req.user.avatar = img;
  await req.user.save();
  ok(res, req.user.toSelf());
}

export async function registerPushToken(req, res) {
  const token = String(req.body?.token || '');
  if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) throw ApiError.badRequest('Invalid push token');
  await User.updateOne({ _id: req.user._id }, { $addToSet: { pushTokens: token } });
  ok(res, { registered: true });
}

/** Public agent profile with their approved listings. */
export async function agentProfile(req, res) {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Agent not found');
  const agent = await User.findOne({ _id: req.params.id, isActive: true });
  if (!agent || agent.role === 'buyer') throw ApiError.notFound('Agent not found');
  const listings = await Property.find({ owner: agent._id, status: 'approved' })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('owner', OWNER_FIELDS);
  ok(res, {
    agent: agent.toPublic(),
    stats: { listings: listings.length },
    listings: await serializeMany(listings, req.user),
  });
}

/** Dashboard numbers for agents/owners. */
export async function myStats(req, res) {
  const uid = req.user._id;
  const props = await Property.find({ owner: uid }).select('_id status views unlockCount').lean();
  const ids = props.map((p) => p._id);
  const [inquiries, visits, unlocks, favorites] = await Promise.all([
    Inquiry.countDocuments({ agent: uid }),
    Visit.countDocuments({ agent: uid, status: { $in: ['requested', 'confirmed'] } }),
    ContactUnlock.countDocuments({ property: { $in: ids } }),
    Favorite.countDocuments({ property: { $in: ids } }),
  ]);
  const byStatus = props.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {});
  ok(res, {
    totalListings: props.length,
    byStatus,
    views: props.reduce((s, p) => s + (p.views || 0), 0),
    unlocks,
    inquiries,
    upcomingVisits: visits,
    favorites,
  });
}
