import { Setting } from '../models/index.js';
import { env } from '../config/env.js';

const DEFAULTS = {
  freeCredits: env.defaultFreeCredits,
  activeCities: env.defaultActiveCities,
};

let cache = null;
let cacheAt = 0;

export async function getSettings() {
  if (cache && Date.now() - cacheAt < 30000) return cache;
  const rows = await Setting.find().lean();
  cache = { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  cacheAt = Date.now();
  return cache;
}

export async function getSetting(key) {
  return (await getSettings())[key];
}

export async function updateSettings(patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULTS)) continue;
    await Setting.findOneAndUpdate({ key }, { value }, { upsert: true });
  }
  cache = null;
  return getSettings();
}

/** Names of the cities that are live. Listings elsewhere are hidden and new posts there are refused. */
export async function getActiveCities() {
  const v = await getSetting('activeCities');
  return Array.isArray(v) && v.length ? v : env.defaultActiveCities;
}

/** Mongo filter for what the public may see: approved listings in live cities. */
export async function publicPropertyFilter(extra = {}) {
  return { status: 'approved', 'address.city': { $in: await getActiveCities() }, ...extra };
}
