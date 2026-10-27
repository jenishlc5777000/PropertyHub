import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '@propertyhub/shared';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'buyer', index: true },
    avatar: { url: String, publicId: String },
    bio: { type: String, maxlength: 500 },
    language: { type: String, default: 'en' },
    pushTokens: { type: [String], default: [], select: false },
    isActive: { type: Boolean, default: true },
    resetOtpHash: { type: String, select: false },
    resetOtpExpires: { type: Date, select: false },
    resetOtpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 12);
};
userSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

/** Public-safe shape. Contact info is never included here. */
userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    name: this.name,
    role: this.role,
    avatar: this.avatar?.url,
    bio: this.bio,
    createdAt: this.createdAt,
  };
};

userSchema.methods.toSelf = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    whatsapp: this.whatsapp,
    role: this.role,
    avatar: this.avatar?.url,
    bio: this.bio,
    language: this.language,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
