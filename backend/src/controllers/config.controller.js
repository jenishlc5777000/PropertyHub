import { ALL_CITIES, LOCALITIES } from '@propertyhub/shared';
import { ok } from '../utils/response.js';
import { getActiveCities, getSetting } from '../services/settings.service.js';

/** Public app configuration: which cities are live (with localities) and the sign-up bonus. */
export async function getConfig(_req, res) {
  const active = await getActiveCities();
  const cities = ALL_CITIES.filter((c) => active.includes(c.name)).map((c) => ({
    ...c,
    localities: LOCALITIES[c.name] || [],
  }));
  res.set('Cache-Control', 'public, max-age=60');
  ok(res, { activeCities: cities, freeCredits: await getSetting('freeCredits') });
}
