import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bath, BedDouble, Heart, MapPin, Maximize, Star } from 'lucide-react';
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
  return (
    <button
      type="button"
      aria-label={on ? 'Remove from favorites' : 'Save to favorites'}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return nav('/login', { state: { from: window.location.pathname } });
        toggle.mutate({ id, on: !on });
      }}
      className={`grid size-9 place-items-center rounded-full bg-white/90 shadow transition hover:scale-105 dark:bg-slate-900/90 ${className}`}
    >
      <Heart className={`size-[18px] ${on ? 'fill-red-500 text-red-500' : 'text-slate-600 dark:text-slate-300'}`} />
    </button>
  );
}

export function PriceTag({ p, className = '' }) {
  const { t } = useTranslation();
  return (
    <span className={className}>
      {formatPriceShort(p.price)}
      {p.purpose === 'rent' && <span className="text-sm font-normal text-slate-500">{t('perMonth')}</span>}
    </span>
  );
}

export default function PropertyCard({ p, showContact = true }) {
  const { t } = useTranslation();
  const cover = p.images?.[0]?.url;
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/property/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-800">
        {cover && (
          <img src={cover} alt={p.title} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className={`chip ${p.purpose === 'rent' ? 'bg-sky-600 text-white' : 'bg-brand-900 text-white'}`}>
            {p.purpose === 'rent' ? t('forRent') : t('forSale')}
          </span>
          {p.featured && (
            <span className="chip bg-amber-400 text-amber-950">
              <Star className="size-3 fill-current" /> Featured
            </span>
          )}
        </div>
        <FavoriteButton id={p._id} className="absolute right-3 top-3" />
        {p.previousPrice > p.price && (
          <span className="chip absolute bottom-3 left-3 bg-red-600 text-white">Price drop</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <PriceTag p={p} className="text-xl font-bold text-brand-900 dark:text-white" />
          <span className="text-xs font-medium text-slate-500">{titleCase(p.type)}</span>
        </div>
        <Link to={`/property/${p.slug}`} className="mt-1 line-clamp-1 font-semibold hover:text-accent-600">
          {p.title}
        </Link>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="size-3.5 shrink-0" />
          <span className="line-clamp-1">
            {p.address?.locality}, {p.address?.city}
          </span>
          {p.distanceKm != null && <span className="ml-auto shrink-0 text-xs">{p.distanceKm} km</span>}
        </p>
        <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          {p.bedrooms > 0 && (
            <span className="flex items-center gap-1"><BedDouble className="size-4" /> {p.bedrooms} {t('beds')}</span>
          )}
          {p.bathrooms > 0 && (
            <span className="flex items-center gap-1"><Bath className="size-4" /> {p.bathrooms} {t('baths')}</span>
          )}
          <span className="flex items-center gap-1"><Maximize className="size-4" /> {p.areaSqft?.toLocaleString('en-IN')} {t('sqft')}</span>
        </div>
        {showContact && (
          <div className="mt-4">
            <ShowContactButton property={p} compact />
          </div>
        )}
      </div>
    </article>
  );
}
