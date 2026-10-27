import mongoose from 'mongoose';
import { PROPERTY_TYPES, PURPOSES, FURNISHING, AMENITIES, PROPERTY_STATUS } from '@propertyhub/shared';

const imageSchema = new mongoose.Schema({ url: String, publicId: String }, { _id: false });

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    type: { type: String, enum: PROPERTY_TYPES, required: true },
    purpose: { type: String, enum: PURPOSES, required: true },
    price: { type: Number, required: true, min: 0 },
    previousPrice: Number,
    areaSqft: { type: Number, required: true },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    furnishing: { type: String, enum: FURNISHING, default: 'unfurnished' },
    amenities: [{ type: String, enum: AMENITIES }],
    address: {
      line: String,
      locality: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      pincode: String,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    images: { type: [imageSchema], default: [] },
    // Contact revealed after unlock. Falls back to the owner's profile contact when empty.
    contact: {
      phone: String,
      whatsapp: String,
      email: String,
    },
    status: { type: String, enum: PROPERTY_STATUS, default: 'pending' },
    rejectionReason: String,
    featured: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    views: { type: Number, default: 0 },
    unlockCount: { type: Number, default: 0 },
    approvedAt: Date,
  },
  { timestamps: true }
);

propertySchema.index(
  { title: 'text', description: 'text', 'address.locality': 'text', 'address.city': 'text' },
  {
    weights: { title: 5, 'address.locality': 4, 'address.city': 3, description: 1 },
    name: 'property_text',
  }
);
propertySchema.index({ location: '2dsphere' });
propertySchema.index({ status: 1, 'address.city': 1, purpose: 1, type: 1, price: 1 });
propertySchema.index({ status: 1, createdAt: -1 });
propertySchema.index({ status: 1, featured: 1, createdAt: -1 });
propertySchema.index({ owner: 1, createdAt: -1 });
propertySchema.index({ unlockCount: -1 });

export const Property = mongoose.model('Property', propertySchema);
