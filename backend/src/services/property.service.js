import { maskPhone, maskEmail } from '@propertyhub/shared';
import { ContactUnlock } from '../models/index.js';

export const OWNER_FIELDS = 'name avatar role phone whatsapp email createdAt';

/** Real contact for a property: listing-specific contact, falling back to the owner's profile. */
export function rawContact(property) {
  const owner = property.owner || {};
  const phone = property.contact?.phone || owner.phone || '';
  return {
    phone,
    whatsapp: property.contact?.whatsapp || owner.whatsapp || phone,
    email: property.contact?.email || owner.email || '',
    name: owner.name,
  };
}

/**
 * Converts a property document into the API shape. Contact details are masked unless the
 * viewer has unlocked it, owns it, or is an admin. This is the ONLY place properties are serialized.
 */
export function serializeProperty(doc, viewer, unlockedIds = new Set()) {
  const p = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const owner = p.owner && typeof p.owner === 'object' && p.owner._id ? p.owner : null;
  const ownerId = String(owner?._id || p.owner || '');
  const contact = rawContact(p);
  const isOwner = viewer && String(viewer._id) === ownerId;
  const isAdmin = viewer?.role === 'admin';
  const unlocked = unlockedIds.has(String(p._id));
  const reveal = unlocked || isOwner || isAdmin;

  const out = {
    ...p,
    lat: p.location?.coordinates?.[1],
    lng: p.location?.coordinates?.[0],
    owner: owner
      ? { _id: owner._id, name: owner.name, avatar: owner.avatar?.url, role: owner.role, createdAt: owner.createdAt }
      : { _id: ownerId },
    contact: reveal
      ? { ...contact, masked: false }
      : {
          name: contact.name,
          phone: maskPhone(contact.phone),
          whatsapp: maskPhone(contact.whatsapp),
          email: maskEmail(contact.email),
          masked: true,
        },
    contactUnlocked: unlocked,
    isOwner: Boolean(isOwner),
  };
  delete out.location;
  delete out.__v;
  if (!isOwner && !isAdmin) delete out.rejectionReason;
  return out;
}

export async function unlockedSetFor(viewer, propertyIds) {
  if (!viewer || !propertyIds.length) return new Set();
  const rows = await ContactUnlock.find({ user: viewer._id, property: { $in: propertyIds } })
    .select('property')
    .lean();
  return new Set(rows.map((r) => String(r.property)));
}

export async function serializeMany(docs, viewer) {
  const set = await unlockedSetFor(
    viewer,
    docs.map((d) => d._id)
  );
  return docs.map((d) => serializeProperty(d, viewer, set));
}
