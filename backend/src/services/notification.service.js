import { Expo } from 'expo-server-sdk';
import { Notification, User } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const expo = new Expo();

async function sendPush(tokens, { title, body, data }) {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (!valid.length || env.isTest) return;
  const messages = valid.map((to) => ({ to, sound: 'default', title, body, data }));
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      // Remove tokens for uninstalled apps.
      const dead = tickets
        .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? chunk[i].to : null))
        .filter(Boolean);
      if (dead.length) await User.updateMany({}, { $pull: { pushTokens: { $in: dead } } });
    } catch (e) {
      logger.warn('Push send failed', e.message);
    }
  }
}

/**
 * Creates an in-app notification and sends a push to all of the user's devices.
 * Fire-and-forget safe: never throws.
 */
export async function notify(userId, { type, title, body, data = {} }) {
  try {
    const n = await Notification.create({ user: userId, type, title, body, data });
    const user = await User.findById(userId).select('+pushTokens');
    if (user?.pushTokens?.length) await sendPush(user.pushTokens, { title, body, data: { ...data, type } });
    return n;
  } catch (e) {
    logger.warn('notify failed', e.message);
  }
}
