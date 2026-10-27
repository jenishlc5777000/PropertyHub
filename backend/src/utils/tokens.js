import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });
}

/** Opaque random refresh token; only its hash is stored so a DB leak can't be replayed. */
export async function issueRefreshToken(user, meta = {}) {
  const token = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + env.jwt.refreshDays * 86400000),
    userAgent: meta.userAgent,
  });
  return token;
}

export async function issueTokens(user, meta) {
  return { accessToken: signAccessToken(user), refreshToken: await issueRefreshToken(user, meta) };
}
