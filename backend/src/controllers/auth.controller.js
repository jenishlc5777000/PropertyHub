import crypto from 'node:crypto';
import { User, RefreshToken } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, created } from '../utils/response.js';
import { issueTokens, sha256 } from '../utils/tokens.js';
import { getOrCreateWallet, summarize } from '../services/credit.service.js';
import { sendMail, templates } from '../services/email.service.js';

const meta = (req) => ({ userAgent: req.get('user-agent')?.slice(0, 200) });

export async function register(req, res) {
  const { name, email, phone, password, role } = req.body;
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  const user = new User({ name, email, phone, whatsapp: phone, role });
  await user.setPassword(password);
  await user.save();
  const wallet = await getOrCreateWallet(user._id);
  sendMail({ to: email, ...templates.welcome(name, wallet.freeCredits) });
  const tokens = await issueTokens(user, meta(req));
  created(res, { user: user.toSelf(), ...tokens, balance: summarize(wallet) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.checkPassword(password))) {
    throw new ApiError(401, 'Incorrect email or password', 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) throw ApiError.forbidden('Your account has been disabled. Contact support.');
  const tokens = await issueTokens(user, meta(req));
  ok(res, { user: user.toSelf(), ...tokens });
}

/** Rotates the refresh token: the old one is revoked and a new pair is issued. */
export async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
  const stored = await RefreshToken.findOne({ tokenHash: sha256(refreshToken) });
  if (!stored || stored.expiresAt < new Date()) throw ApiError.unauthorized('Session expired');
  if (stored.revokedAt) {
    // Reuse of a rotated token: likely theft. Revoke every session for this user.
    await RefreshToken.updateMany({ user: stored.user, revokedAt: null }, { revokedAt: new Date() });
    throw ApiError.unauthorized('Session expired');
  }
  const user = await User.findById(stored.user);
  if (!user?.isActive) throw ApiError.unauthorized();
  stored.revokedAt = new Date();
  await stored.save();
  ok(res, await issueTokens(user, meta(req)));
}

export async function logout(req, res) {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    await RefreshToken.updateOne({ tokenHash: sha256(refreshToken) }, { revokedAt: new Date() });
  }
  ok(res, { loggedOut: true });
}

export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const otp = String(crypto.randomInt(100000, 1000000));
    user.resetOtpHash = sha256(otp);
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOtpAttempts = 0;
    await user.save();
    await sendMail({ to: user.email, ...templates.otp(user.name, otp) });
  }
  // Same response whether or not the email exists, to prevent account enumeration.
  ok(res, { message: 'If that email is registered, a 6-digit code has been sent.' });
}

export async function resetPassword(req, res) {
  const { email, otp, password } = req.body;
  const user = await User.findOne({ email }).select('+resetOtpHash +resetOtpExpires +resetOtpAttempts');
  const invalid = () => new ApiError(400, 'Invalid or expired code', 'INVALID_OTP');
  if (!user?.resetOtpHash || user.resetOtpExpires < new Date()) throw invalid();
  if (user.resetOtpAttempts >= 5) throw new ApiError(429, 'Too many attempts. Request a new code.', 'OTP_LOCKED');
  if (user.resetOtpHash !== sha256(otp)) {
    user.resetOtpAttempts += 1;
    await user.save();
    throw invalid();
  }
  await user.setPassword(password);
  user.resetOtpHash = undefined;
  user.resetOtpExpires = undefined;
  user.resetOtpAttempts = 0;
  await user.save();
  await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
  ok(res, { message: 'Password updated. Please log in.' });
}
