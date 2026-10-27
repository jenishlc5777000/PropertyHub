import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 1 }, // INR, GST inclusive
    credits: { type: Number, required: true, min: 1 },
    validityDays: { type: Number, required: true, default: 365 },
    active: { type: Boolean, default: true },
    benefits: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', schema);
