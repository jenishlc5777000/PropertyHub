import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { List, LocateFixed, Map as MapIcon, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../lib/api';
import Filters from '../components/Filters';
import PropertyCard from '../components/PropertyCard';
import MapView from '../components/MapView';
import { EmptyState, ErrorState, GridSkeleton, Modal, Seo, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null));

export default function Listings() {
  const { t } = useTranslation();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [near, setNear] = useState(null); // { lat, lng, radiusKm }
  const [locating, setLocating] = useState(false);
  const filters = useMemo(() => clean(Object.fromEntries(params)), [params]);

  const list = useInfiniteQuery({
    queryKey: ['properties', filters],
    queryFn: ({ pageParam }) => api.properties.list({ ...filters, page: pageParam, limit: 12 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    enabled: !near,
  });

  const nearQ = useQuery({
    queryKey: ['near', near, filters.purpose],
    queryFn: () => api.properties.near({ ...near, purpose: filters.purpose }),
    enabled: Boolean(near),
  });

  const items = near ? nearQ.data || [] : list.data?.pages.flatMap((p) => p.items) || [];
  const total = near ? items.length : list.data?.pages[0]?.meta.total;
  const active = near ? nearQ : list;

  // Infinite scroll sentinel
  const sentinel = useRef(null);
  useEffect(() => {
    if (!sentinel.current || near || view !== 'list') return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
    }, { rootMargin: '400px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [list, near, view]);

  const apply = (f) => {
    setNear(null);
    setParams(clean(f));
    setShowFilters(false);
  };

  const findNearMe = () => {
    if (!navigator.geolocation) return toast('Geolocation is not supported by your browser', 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm: 15 });
      },
      () => {
        setLocating(false);
        toast('Location permission denied. Showing all properties instead.', 'error');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const title = ['', filters.type && `${filters.type}s`, filters.purpose === 'rent' ? 'for rent' : filters.purpose === 'sale' ? 'for sale' : '', filters.city && `in ${filters.city}`]
    .filter(Boolean)
    .join(' ');
  const heading = filters.type ? title.trim().charAt(0).toUpperCase() + title.trim().slice(1) : `Properties ${title.trim()}`.trim();

  return (
    <div className="container-x py-8">
      <Seo title={heading} description={`Browse ${heading.toLowerCase()} on PropertyHub. Verified listings with photos, prices and direct owner contact.`} path={`/properties?${params}`} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{near ? `${t('nearMe')} (${near.radiusKm} km)` : heading}</h1>
          {total != null && <p className="text-sm text-slate-500">{t('results', { count: total })}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {near ? (
            <button className="btn-outline" onClick={() => setNear(null)}><X className="size-4" /> {t('nearMe')}</button>
          ) : (
            <button className="btn-outline" onClick={findNearMe} disabled={locating}>
              {locating ? <Spinner className="size-4" /> : <LocateFixed className="size-4" />} {t('nearMe')}
            </button>
          )}
          <select
            className="input w-auto"
            value={filters.sort || 'newest'}
            onChange={(e) => apply({ ...filters, sort: e.target.value })}
            aria-label="Sort"
            disabled={Boolean(near)}
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="price_asc">{t('sortPriceAsc')}</option>
            <option value="price_desc">{t('sortPriceDesc')}</option>
          </select>
          <div className="flex rounded-xl border border-slate-300 p-0.5 dark:border-slate-700">
            <button onClick={() => setView('list')} className={`rounded-lg p-2 ${view === 'list' ? 'bg-brand-900 text-white' : ''}`} aria-label={t('listView')}><List className="size-4" /></button>
            <button onClick={() => setView('map')} className={`rounded-lg p-2 ${view === 'map' ? 'bg-brand-900 text-white' : ''}`} aria-label={t('mapView')}><MapIcon className="size-4" /></button>
          </div>
          <button className="btn-outline lg:hidden" onClick={() => setShowFilters(true)}><SlidersHorizontal className="size-4" /> {t('filters')}</button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-20 p-5">
            <h2 className="mb-4 font-semibold">{t('filters')}</h2>
            <Filters params={params} onApply={apply} />
          </div>
        </aside>

        <div>
          {active.isLoading ? (
            <GridSkeleton count={6} />
          ) : active.isError ? (
            <ErrorState error={active.error} onRetry={active.refetch} />
          ) : !items.length ? (
            <EmptyState icon={SearchX} title="No properties match your filters" text="Try widening the price range, removing amenities or searching another locality." action={<button className="btn-primary" onClick={() => apply({})}>{t('reset')}</button>} />
          ) : view === 'map' ? (
            <MapView properties={items} center={near ? [near.lat, near.lng] : undefined} radiusKm={near?.radiusKm} className="h-[70vh]" />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => <PropertyCard key={p._id} p={p} />)}
              </div>
              <div ref={sentinel} className="flex justify-center py-8">
                {list.isFetchingNextPage && <Spinner className="size-6 text-accent-600" />}
                {!near && !list.hasNextPage && items.length > 12 && <p className="text-sm text-slate-500">You've reached the end</p>}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={showFilters} onClose={() => setShowFilters(false)} title={t('filters')}>
        <Filters params={params} onApply={apply} />
      </Modal>
    </div>
  );
}
