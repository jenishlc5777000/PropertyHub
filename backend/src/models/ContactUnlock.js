import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    creditType: { type: String, enum: ['free', 'paid'], required: true },
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ user: 1, property: 1 }, { unique: true });
schema.index({ user: 1, createdAt: -1 });
schema.index({ createdAt: -1 });

export const ContactUnlock = mongoose.model('ContactUnlock', schema);
