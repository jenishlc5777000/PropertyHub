import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  },
  { timestamps: true }
);
schema.index({ user: 1, property: 1 }, { unique: true });

export const Favorite = mongoose.model('Favorite', schema);
