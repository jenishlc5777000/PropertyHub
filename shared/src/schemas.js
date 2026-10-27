import { z } from 'zod';
import {
  PROPERTY_TYPES,
  PURPOSES,
  FURNISHING,
  AMENITIES,
  MAX_IMAGES,
  VISIT_STATUS,
} from './constants.js';

// Indian mobile: 10 digits starting 6-9, optional +91 prefix.
export const phoneRegex = /^(\+91)?[6-9]\d{9}$/;

const email = z.string().trim().toLowerCase().email('Enter a valid email');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');
const phone = z.string().trim().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60),
  email,
  phone,
  password,
  role: z.enum(['buyer', 'agent']).default('buyer'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  password,
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone: phone.optional(),
  whatsapp: phone.optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional(),
  language: z.enum(['en', 'hi', 'ta', 'te', 'kn', 'ml']).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

const coerceNum = (schema) => z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), schema);

export const propertySchema = z.object({
  title: z.string().trim().min(10, 'Title must be at least 10 characters').max(120),
  description: z.string().trim().min(30, 'Description must be at least 30 characters').max(5000),
  type: z.enum(PROPERTY_TYPES),
  purpose: z.enum(PURPOSES),
  price: coerceNum(z.number().positive('Price must be positive').max(1e11)),
  areaSqft: coerceNum(z.number().positive('Area must be positive').max(1e7)),
  bedrooms: coerceNum(z.number().int().min(0).max(20)).default(0),
  bathrooms: coerceNum(z.number().int().min(0).max(20)).default(0),
  furnishing: z.enum(FURNISHING).default('unfurnished'),
  amenities: z
    .preprocess(
      (v) => (typeof v === 'string' ? (v ? v.split(',') : []) : v),
      z.array(z.enum(AMENITIES))
    )
    .default([]),
  address: z.object({
    line: z.string().trim().min(3, 'Address is required').max(200),
    locality: z.string().trim().min(2, 'Locality is required').max(80),
    city: z.string().trim().min(2, 'City is required').max(60),
    state: z.string().trim().min(2, 'State is required').max(60),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  }),
  lat: coerceNum(z.number().min(-90).max(90)),
  lng: coerceNum(z.number().min(-180).max(180)),
  contactPhone: phone.optional().or(z.literal('')),
  contactWhatsapp: phone.optional().or(z.literal('')),
  contactEmail: email.optional().or(z.literal('')),
});

export const propertyUpdateSchema = propertySchema.partial().extend({
  removeImages: z.array(z.string()).max(MAX_IMAGES).optional(),
});

export const propertyFilterSchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(60).optional(),
  locality: z.string().trim().max(80).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  purpose: z.enum(PURPOSES).optional(),
  minPrice: coerceNum(z.number().min(0).optional()),
  maxPrice: coerceNum(z.number().min(0).optional()),
  beds: coerceNum(z.number().int().min(0).max(20).optional()),
  furnishing: z.enum(FURNISHING).optional(),
  amenities: z
    .preprocess((v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v), z.array(z.enum(AMENITIES)))
    .optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  // featured listings are pinned to the top unless boost=0
  boost: z.enum(['0', '1']).default('1'),
  page: coerceNum(z.number().int().min(1).default(1)),
  limit: coerceNum(z.number().int().min(1).max(50).default(12)),
});

export const nearSchema = z.object({
  lat: coerceNum(z.number().min(-90).max(90)),
  lng: coerceNum(z.number().min(-180).max(180)),
  radiusKm: coerceNum(z.number().min(0.5).max(100).default(10)),
  purpose: z.enum(PURPOSES).optional(),
  limit: coerceNum(z.number().int().min(1).max(100).default(50)),
});

export const inquirySchema = z.object({
  propertyId: z.string().min(1),
  message: z.string().trim().min(5, 'Message is too short').max(1000),
});

export const messageSchema = z.object({
  text: z.string().trim().min(1, 'Message cannot be empty').max(1000),
});

export const visitSchema = z.object({
  propertyId: z.string().min(1),
  date: z.coerce.date().refine((d) => d.getTime() > Date.now() - 86400000, 'Pick a future date'),
  slot: z.enum(['morning', 'afternoon', 'evening']),
  note: z.string().trim().max(300).optional(),
});

export const visitStatusSchema = z.object({ status: z.enum(VISIT_STATUS) });

export const createOrderSchema = z.object({
  planId: z.string().min(1),
  promoCode: z.string().trim().toUpperCase().max(30).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const planSchema = z.object({
  name: z.string().trim().min(2).max(60),
  price: z.number().positive().max(1e7),
  credits: z.number().int().positive().max(100000),
  validityDays: z.number().int().positive().max(3650),
  active: z.boolean().default(true),
  benefits: z.array(z.string().trim().max(120)).max(10).default([]),
});

export const grantCreditsSchema = z.object({
  amount: z.number().int().min(-10000).max(10000).refine((n) => n !== 0, 'Amount cannot be 0'),
  kind: z.enum(['free', 'paid']).default('free'),
  validityDays: z.number().int().positive().max(3650).optional(),
  reason: z.string().trim().max(200).optional(),
});

export const promoSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(30),
  discountPct: z.number().min(1).max(90),
  maxUses: z.number().int().positive().default(100),
  expiresAt: z.coerce.date(),
  active: z.boolean().default(true),
});

/** Turn a ZodError into { field: message } for forms. */
export function zodFieldErrors(error) {
  const out = {};
  for (const issue of error?.issues || []) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
