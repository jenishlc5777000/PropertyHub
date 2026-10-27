import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Info, List, LocateFixed, Map as MapIcon, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { RADIUS_OPTIONS_KM, SERVICE_RADIUS_KM, nearestCity } from '@propertyhub/shared';
import { useConfig } from '../hooks/useData';
import { api } from '../lib/api';
import Filters from '../components/Filters';
import PropertyCard from '../components/PropertyCard';
import MapView from '../components/MapView';
import { EmptyState, ErrorState, GridSkeleton, Modal, Seo, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { Reveal, stagger } from '../components/motion';

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null));

export default function Listings() {
  const { t } = useTranslation();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [near, setNear] = useState(null); // { lat, lng }
  const [radiusKm, setRadiusKm] = useState(5);
  const [locating, setLocating] = useState(false);
  const [outside, setOutside] = useState(null); // nearest live city when the user is out of area
  const { cities, singleCity } = useConfig();
  const filters = useMemo(() => {
    const f = clean(Object.fromEntries(params));
    delete f.near;
    return f;
  }, [params]);

  const list = useInfiniteQuery({
    queryKey: ['properties', filters],
    queryFn: ({ pageParam }) => api.properties.list({ ...filters, page: pageParam, limit: 12 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    enabled: !near,
  });

  const nearParams = clean({ purpose: filters.purpose, type: filters.type, beds: filters.beds, minPrice: filters.minPrice, maxPrice: filters.maxPrice });
  const nearQ = useQuery({
    queryKey: ['near', near, radiusKm, nearParams],
    queryFn: () => api.properties.near({ ...near, radiusKm, ...nearParams }),
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
    setParams(clean(f));
    setShowFilters(false);
  };

  const findNearMe = () => {
    if (!navigator.geolocation) return toast('Geolocation is not supported by your browser', 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        const closest = nearestCity(lat, lng, cities);
        if (closest && closest.distanceKm > SERVICE_RADIUS_KM) {
          setOutside(closest);
          setNear(null);
          return;
        }
        setOutside(null);
        setNear({ lat, lng });
      },
      () => {
        setLocating(false);
        toast('Location permission denied. Showing all properties instead.', 'error');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  // "Near me" chip on the home page links here with ?near=1
  const autoNear = params.get('near') === '1';
  useEffect(() => {
    if (autoNear) findNearMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNear]);

  const place = filters.locality ? `in ${filters.locality}` : filters.city ? `in ${filters.city}` : singleCity ? `in ${singleCity.name}` : '';
  const title = ['', filters.type && `${filters.type}s`, filters.purpose === 'rent' ? 'for rent' : filters.purpose === 'sale' ? 'for sale' : '', place]
    .filter(Boolean)
    .join(' ');
  const heading = filters.type ? title.trim().charAt(0).toUpperCase() + title.trim().slice(1) : `Properties ${title.trim()}`.trim();

  return (
    <div className="container-x py-8">
      <Seo title={heading} description={`Browse ${heading.toLowerCase()} on PropertyHub. Verified listings with photos, prices and direct owner contact.`} path={`/properties?${params}`} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-tight sm:text-[36px]">{near ? `${t('nearMe')} · within ${radiusKm} km` : heading}</h1>
          {total != null && <p className="text-sm text-slate-500">{t('results', { count: total })}{near ? ' · nearest first' : ''}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {near ? (
            <>
              <div className="flex rounded-xl border border-slate-300 p-0.5 dark:border-slate-700" role="group" aria-label="Search radius">
                {RADIUS_OPTIONS_KM.map((r) => (
                  <button key={r} onClick={() => setRadiusKm(r)} className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${radiusKm === r ? 'bg-accent-600 text-white' : ''}`}>
                    {r} km
                  </button>
                ))}
              </div>
              <button className="btn-outline" onClick={() => setNear(null)}><X className="size-4" /> {t('nearMe')}</button>
            </>
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

      {outside && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Info className="mt-0.5 size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">PropertyHub isn't available in your area yet.</p>
            <p>
              We're currently live only in {cities.map((c) => c.name).join(', ')} (about {Math.round(outside.distanceKm)} km from you). Here are listings in {outside.name}.
            </p>
          </div>
          <button onClick={() => setOutside(null)} aria-label="Dismiss"><X className="size-4" /></button>
        </div>
      )}

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
            near ? (
              <EmptyState
                icon={LocateFixed}
                title={`No properties within ${radiusKm} km of you`}
                text="Try a wider radius or browse by locality."
                action={
                  radiusKm < 20 ? (
                    <button className="btn-primary" onClick={() => setRadiusKm(RADIUS_OPTIONS_KM.find((r) => r > radiusKm))}>
                      Search within {RADIUS_OPTIONS_KM.find((r) => r > radiusKm)} km
                    </button>
                  ) : (
                    <button className="btn-outline" onClick={() => setNear(null)}>Show all</button>
                  )
                }
              />
            ) : (
              <EmptyState icon={SearchX} title="No properties match your filters" text="Try widening the price range, removing amenities or searching another locality." action={<button className="btn-primary" onClick={() => apply({})}>{t('reset')}</button>} />
            )
          ) : view === 'map' ? (
            <MapView properties={items} center={near ? [near.lat, near.lng] : undefined} radiusKm={near ? radiusKm : undefined} className="h-[70vh]" />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p, i) => (
                  <Reveal key={p._id} delay={stagger(i)}>
                    <PropertyCard p={p} />
                  </Reveal>
                ))}
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
