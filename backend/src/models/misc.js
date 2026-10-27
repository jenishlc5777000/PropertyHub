import mongoose from 'mongoose';

// Key/value settings editable by admin (e.g. freeCredits).
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);
export const Setting = mongoose.model('Setting', settingSchema);

const promoSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    discountPct: { type: Number, required: true, min: 1, max: 90 },
    maxUses: { type: Number, default: 100 },
    used: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const PromoCode = mongoose.model('PromoCode', promoSchema);

// Atomic sequence counters (gap-free invoice numbers).
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.model('Counter', counterSchema);

export async function nextSeq(name, session) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return doc.seq;
}

const auditSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    meta: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditSchema.index({ severity: 1, createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', auditSchema);
