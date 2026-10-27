import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MapPin, Star, TrendingDown } from 'lucide-react';
import { formatPriceShort, titleCase } from '@propertyhub/shared';
import { useAuth } from '../context/AuthContext';
import { useFavoriteIds, useToggleFavorite } from '../hooks/useData';
import ShowContactButton from './ShowContact';

export function FavoriteButton({ id, className = '' }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: favs } = useFavoriteIds();
  const toggle = useToggleFavorite();
  const on = favs?.has(id);
  const [pop, setPop] = useState(0); // bump to replay the pop animation
  return (
    <button
      type="button"
      aria-label={on ? 'Remove from favorites' : 'Save to favorites'}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return nav('/login', { state: { from: window.location.pathname } });
        if (!on) setPop((n) => n + 1);
        toggle.mutate({ id, on: !on });
      }}
      className={`grid size-9 place-items-center rounded-full bg-white/85 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:scale-110 active:scale-95 dark:bg-slate-900/80 ${className}`}
    >
      <Heart
        key={pop}
        className={`size-[18px] transition ${on ? 'fill-red-500 text-red-500' : 'text-slate-700 dark:text-slate-200'} ${pop ? 'animate-heart-pop' : ''}`}
        strokeWidth={1.75}
      />
    </button>
  );
}

export function PriceTag({ p, className = '' }) {
  const { t } = useTranslation();
  return (
    <span className={`font-display tracking-tight ${className}`}>
      {formatPriceShort(p.price)}
      {p.purpose === 'rent' && <span className="font-sans text-sm font-medium tracking-normal text-slate-500">{t('perMonth')}</span>}
    </span>
  );
}

/** One quiet line of specs: "3 Beds · 2 Baths · 1,450 sq.ft" */
export function Specs({ p, className = '' }) {
  const { t } = useTranslation();
  const parts = [
    p.bedrooms > 0 && `${p.bedrooms} ${t('beds')}`,
    p.bathrooms > 0 && `${p.bathrooms} ${t('baths')}`,
    `${p.areaSqft?.toLocaleString('en-IN')} ${t('sqft')}`,
  ].filter(Boolean);
  return (
    <p className={`text-sm text-slate-500 ${className}`}>
      {parts.map((x, i) => (
        <span key={x}>
          {i > 0 && <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>}
          {x}
        </span>
      ))}
    </p>
  );
}

export default function PropertyCard({ p, showContact = true }) {
  const { t } = useTranslation();
  const cover = p.images?.[0]?.url;
  return (
    <article className="card group flex flex-col p-3 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link to={`/property/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-[14px] bg-slate-100 dark:bg-slate-800">
        {cover && (
          <img src={cover} alt={p.title} loading="lazy" className="size-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]" />
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            <span className={`chip shadow-sm ${p.purpose === 'rent' ? 'bg-white/90 text-sky-800' : 'bg-white/90 text-brand-900'} backdrop-blur`}>
              {p.purpose === 'rent' ? t('forRent') : t('forSale')}
            </span>
            {p.featured && (
              <span className="chip bg-gold-500 text-white shadow-sm">
                <Star className="size-3 fill-current" /> Featured
              </span>
            )}
          </div>
          <FavoriteButton id={p._id} />
        </div>
        {p.previousPrice > p.price && (
          <span className="chip absolute bottom-3 left-3 bg-red-700 text-white shadow-sm">
            <TrendingDown className="size-3" /> Price drop
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <PriceTag p={p} className="text-2xl font-semibold text-slate-900 dark:text-white" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{titleCase(p.type)}</span>
        </div>
        <Link to={`/property/${p.slug}`} className="mt-1 line-clamp-1 font-semibold text-slate-900 transition hover:text-accent-600 dark:text-slate-100">
          {p.title}
        </Link>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} />
          <span className="line-clamp-1">
            {p.address?.locality}, {p.address?.city}
          </span>
          {p.distanceKm != null && <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{p.distanceKm} km</span>}
        </p>
        <Specs p={p} className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800" />
        {showContact && (
          <div className="mt-4">
            <ShowContactButton property={p} compact />
          </div>
        )}
      </div>
    </article>
  );
}
