import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['inquiry', 'message', 'visit', 'listing', 'price_drop', 'credits', 'payment', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    body: String,
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
schema.index({ user: 1, createdAt: -1 });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // keep 90 days

export const Notification = mongoose.model('Notification', schema);
