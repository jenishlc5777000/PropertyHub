import mongoose from 'mongoose';
import { VISIT_STATUS } from '@propertyhub/shared';

const schema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    slot: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    note: String,
    status: { type: String, enum: VISIT_STATUS, default: 'requested' },
  },
  { timestamps: true }
);
schema.index({ agent: 1, date: 1 });

export const Visit = mongoose.model('Visit', schema);
