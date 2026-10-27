import { Property, User } from '../models/index.js';
import { env } from '../config/env.js';
import { getActiveCities, publicPropertyFilter } from '../services/settings.service.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** XML sitemap for the web app's public pages. */
export async function sitemap(_req, res) {
  const base = env.webUrl.replace(/\/$/, '');
  const cities = await getActiveCities();
  const [props, agents] = await Promise.all([
    Property.find(await publicPropertyFilter()).select('slug updatedAt').sort({ updatedAt: -1 }).limit(45000).lean(),
    User.find({ role: 'agent', isActive: true }).select('_id updatedAt').limit(5000).lean(),
  ]);
  const urls = [
    { loc: `${base}/`, priority: '1.0' },
    { loc: `${base}/properties`, priority: '0.9' },
    ...cities.flatMap((c) => [
      { loc: `${base}/properties?city=${encodeURIComponent(c)}&purpose=sale`, priority: '0.8' },
      { loc: `${base}/properties?city=${encodeURIComponent(c)}&purpose=rent`, priority: '0.8' },
    ]),
    ...props.map((p) => ({ loc: `${base}/property/${p.slug}`, lastmod: p.updatedAt, priority: '0.7' })),
    ...agents.map((a) => ({ loc: `${base}/agents/${a._id}`, lastmod: a.updatedAt, priority: '0.5' })),
    ...['about', 'contact', 'privacy', 'terms', 'refund-policy'].map((p) => ({ loc: `${base}/${p}`, priority: '0.3' })),
  ];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
      )
      .join('\n') +
    '\n</urlset>\n';
  res.type('application/xml').send(xml);
}

export function robots(_req, res) {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${env.apiUrl}/sitemap.xml\n`);
}
