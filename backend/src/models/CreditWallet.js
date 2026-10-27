import mongoose from 'mongoose';

const paidBatchSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    initial: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    source: { type: String, enum: ['purchase', 'admin'], default: 'purchase' },
    warned: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    freeCredits: { type: Number, default: 0, min: 0 },
    paidCredits: { type: [paidBatchSchema], default: [] },
  },
  { timestamps: true }
);

export const CreditWallet = mongoose.model('CreditWallet', schema);
