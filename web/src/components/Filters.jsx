import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AMENITIES, CITIES, FURNISHING, PROPERTY_TYPES, titleCase } from '@propertyhub/shared';

const PRICE_SALE = [0, 2500000, 5000000, 7500000, 10000000, 20000000, 50000000, 100000000];
const PRICE_RENT = [0, 10000, 20000, 30000, 50000, 75000, 100000, 200000];
const label = (n) => (n >= 1e7 ? `₹${n / 1e7} Cr` : n >= 1e5 ? `₹${n / 1e5} L` : n >= 1e3 ? `₹${n / 1e3}K` : '₹0');

/** Filter panel bound to URL search params (so filtered results are shareable / SEO friendly). */
export default function Filters({ params, onApply }) {
  const { t } = useTranslation();
  const [f, setF] = useState(() => Object.fromEntries(params));
  useEffect(() => setF(Object.fromEntries(params)), [params]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const amenities = (f.amenities || '').split(',').filter(Boolean);
  const prices = f.purpose === 'rent' ? PRICE_RENT : PRICE_SALE;

  const toggleAmenity = (a) =>
    set('amenities', (amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a]).join(','));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(f);
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {['sale', 'rent'].map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setF((x) => ({ ...x, purpose: p, minPrice: '', maxPrice: '' }))}
            className={`rounded-lg py-2 text-sm font-semibold ${f.purpose === p ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'}`}
          >
            {p === 'sale' ? t('buy') : t('rent')}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="label">{t('city')}</span>
        <select className="input" value={f.city || ''} onChange={(e) => set('city', e.target.value)}>
          <option value="">{t('any')}</option>
          {CITIES.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label">{t('locality')}</span>
        <input className="input" value={f.locality || ''} onChange={(e) => set('locality', e.target.value)} placeholder="e.g. Whitefield" />
      </label>

      <label className="block">
        <span className="label">{t('type')}</span>
        <select className="input" value={f.type || ''} onChange={(e) => set('type', e.target.value)}>
          <option value="">{t('any')}</option>
          {PROPERTY_TYPES.map((x) => (
            <option key={x} value={x}>{titleCase(x)}</option>
          ))}
        </select>
      </label>

      <div>
        <span className="label">{t('price')}</span>
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={f.minPrice || ''} onChange={(e) => set('minPrice', e.target.value)} aria-label={t('minPrice')}>
            <option value="">{t('minPrice')}</option>
            {prices.map((p) => <option key={p} value={p}>{label(p)}</option>)}
          </select>
          <select className="input" value={f.maxPrice || ''} onChange={(e) => set('maxPrice', e.target.value)} aria-label={t('maxPrice')}>
            <option value="">{t('maxPrice')}</option>
            {prices.slice(1).map((p) => <option key={p} value={p}>{label(p)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <span className="label">{t('bedrooms')}</span>
        <div className="flex gap-2">
          {['', '1', '2', '3', '4'].map((b) => (
            <button
              type="button"
              key={b}
              onClick={() => set('beds', b)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium ${(f.beds || '') === b ? 'border-accent-600 bg-accent-50 text-accent-700 dark:bg-accent-600/10' : 'border-slate-300 dark:border-slate-700'}`}
            >
              {b === '' ? t('any') : b === '4' ? '4+' : b}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="label">{t('furnishing')}</span>
        <select className="input" value={f.furnishing || ''} onChange={(e) => set('furnishing', e.target.value)}>
          <option value="">{t('any')}</option>
          {FURNISHING.map((x) => <option key={x} value={x}>{titleCase(x)}</option>)}
        </select>
      </label>

      <div>
        <span className="label">{t('amenities')}</span>
        <div className="flex flex-wrap gap-1.5">
          {AMENITIES.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => toggleAmenity(a)}
              className={`chip border ${amenities.includes(a) ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}
            >
              {titleCase(a)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" className="btn-outline flex-1" onClick={() => onApply({ purpose: f.purpose || '' })}>{t('reset')}</button>
        <button type="submit" className="btn-primary flex-1">{t('apply')}</button>
      </div>
    </form>
  );
}
