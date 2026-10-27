import mongoose from 'mongoose';
import { ORDER_STATUS } from '@propertyhub/shared';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    planName: String,
    razorpayOrderId: { type: String, required: true, unique: true },
    paymentId: { type: String },
    amount: { type: Number, required: true }, // INR, GST inclusive
    baseAmount: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    promoCode: String,
    credits: { type: Number, required: true },
    validityDays: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUS, default: 'created', index: true },
    invoiceNo: { type: String },
    paidAt: Date,
    failureReason: String,
    refundId: String,
    refundedAt: Date,
  },
  { timestamps: true }
);
// A payment id can only ever credit one order.
schema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $type: 'string' } } }
);
schema.index(
  { invoiceNo: 1 },
  { unique: true, partialFilterExpression: { invoiceNo: { $type: 'string' } } }
);
schema.index({ status: 1, paidAt: -1 });

export const Order = mongoose.model('Order', schema);
