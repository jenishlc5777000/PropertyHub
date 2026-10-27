import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Building, Building2, Calculator, Home as HomeIcon, LandPlot, LocateFixed, MapPin, Search, Trees } from 'lucide-react';
import { api } from '../lib/api';
import { useConfig } from '../hooks/useData';
import PropertyCard from '../components/PropertyCard';
import { ErrorState, GridSkeleton, SectionHeader, Seo } from '../components/ui';
import { CountUp, Reveal, stagger } from '../components/motion';

/** Hero entrance: each block fades up slightly after the previous one. */
const enter = (i) => ({ className: 'animate-fade-up', style: { animationDelay: `${120 + i * 90}ms` } });

const TYPES = [
  { type: 'apartment', icon: Building, label: 'Apartments' },
  { type: 'villa', icon: Trees, label: 'Villas' },
  { type: 'house', icon: HomeIcon, label: 'Independent houses' },
  { type: 'plot', icon: LandPlot, label: 'Plots' },
  { type: 'commercial', icon: Building2, label: 'Offices & shops' },
];

function ViewAll({ to }) {
  const { t } = useTranslation();
  return (
    <Link to={to} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
      <span className="border-b-2 border-accent-600 pb-0.5">{t('viewAll')}</span>
      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function Grid({ query }) {
  if (query.isLoading) return <GridSkeleton count={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const items = Array.isArray(query.data) ? query.data : query.data?.items || [];
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.slice(0, 6).map((p, i) => (
        <Reveal key={p._id} delay={stagger(i)}>
          <PropertyCard p={p} />
        </Reveal>
      ))}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [purpose, setPurpose] = useState('sale');
  const [q, setQ] = useState('');
  const [locality, setLocality] = useState('');
  const { cities, singleCity, freeCredits } = useConfig();
  const cityNames = cities.map((c) => c.name).join(', ');
  const areas = cities.flatMap((c) => c.localities.map((l) => ({ ...l, city: c.name })));
  const featured = useQuery({ queryKey: ['featured'], queryFn: api.properties.featured });
  const latest = useQuery({ queryKey: ['properties', { sort: 'newest', limit: 6, boost: '0' }], queryFn: () => api.properties.list({ sort: 'newest', limit: 6, boost: '0' }) });
  const liveCount = latest.data?.meta?.total;

  const search = (e) => {
    e.preventDefault();
    const p = new URLSearchParams({ purpose });
    if (q.trim()) p.set('q', q.trim());
    if (locality) {
      const a = areas.find((x) => `${x.city}|${x.name}` === locality);
      p.set('locality', a.name);
      if (!singleCity) p.set('city', a.city);
    }
    nav(`/properties?${p}`);
  };

  const stats = [
    liveCount != null && { value: liveCount, label: 'verified homes live' },
    { value: areas.length, label: 'localities covered' },
    { value: freeCredits ?? 7, label: 'free owner contacts' },
  ].filter(Boolean);

  return (
    <>
      <Seo description={`Search verified flats, villas, houses, plots and offices for sale and rent in ${cityNames}. Talk to owners directly.`} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-900">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=75&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 -z-10 size-full animate-ken-burns object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-900 via-brand-900/55 to-brand-900/10" />
        <div className="container-x pb-14 pt-24 sm:pb-20 sm:pt-36">
          <span {...enter(0)} className={`chip bg-white/10 px-3 py-1.5 text-white ring-1 ring-white/20 backdrop-blur ${enter(0).className}`}>
            <span className="size-1.5 rounded-full bg-accent-400" /> Now live in {cityNames}
          </span>
          <h1 style={enter(1).style} className="mt-5 max-w-3xl animate-fade-up text-[40px] leading-[1.05] text-white sm:text-[60px]">
            {singleCity ? t('taglineCity', { city: singleCity.name }) : t('tagline')}
          </h1>
          <p style={enter(2).style} className="mt-5 max-w-xl animate-fade-up text-lg text-white/80">{t('heroSubtitle')}</p>

          <form onSubmit={search} style={enter(3).style} className="mt-10 max-w-3xl animate-fade-up">
            <div className="inline-flex rounded-t-2xl bg-white/95 p-1.5 pb-0 dark:bg-slate-900/95" role="tablist" aria-label={t('purpose')}>
              {['sale', 'rent'].map((p) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={purpose === p}
                  key={p}
                  onClick={() => setPurpose(p)}
                  className={`rounded-t-xl px-6 pb-2.5 pt-2 text-sm font-semibold transition ${purpose === p ? 'border-b-2 border-accent-600 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  {p === 'sale' ? t('buy') : t('rent')}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 rounded-2xl rounded-tl-none bg-white p-2 shadow-lift sm:flex-row sm:items-center dark:bg-slate-900">
              <div className="relative sm:w-60">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-accent-600" />
                <select value={locality} onChange={(e) => setLocality(e.target.value)} className="input border-transparent bg-slate-50 pl-10 dark:bg-slate-800" aria-label={t('locality')}>
                  <option value="">All of {singleCity ? singleCity.name : 'our cities'}</option>
                  {areas.map((a) => (
                    <option key={`${a.city}|${a.name}`} value={`${a.city}|${a.name}`}>
                      {a.name}
                      {singleCity ? '' : `, ${a.city}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="input border-transparent bg-slate-50 pl-10 dark:bg-slate-800" placeholder={t('searchPlaceholder')} aria-label={t('search')} />
              </div>
              <button className="btn-primary px-8 py-3">{t('search')}</button>
            </div>
          </form>

          <div style={enter(4).style} className="mt-6 flex animate-fade-up flex-wrap items-center gap-2">
            <Link to="/properties?near=1" className="chip bg-accent-600 px-3 py-1.5 text-white hover:bg-accent-700">
              <LocateFixed className="size-3.5" /> {t('nearMe')}
            </Link>
            {areas.slice(0, 6).map((a) => (
              <Link key={`${a.city}|${a.name}`} to={`/properties?locality=${encodeURIComponent(a.name)}`} className="chip px-3 py-1.5 text-white/85 ring-1 ring-white/25 transition hover:bg-white/10 hover:text-white">
                {a.name}
              </Link>
            ))}
          </div>

          <dl style={enter(5).style} className="mt-14 grid max-w-2xl animate-fade-up grid-cols-3 gap-6 border-t border-white/15 pt-6">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl text-white tabular-nums sm:text-4xl">
                  <CountUp value={s.value} />
                </dd>
                <dd className="mt-1 text-xs text-white/70 sm:text-sm">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Property types */}
      <section className="container-x mt-12">
        <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible">
          {TYPES.map(({ type, icon: Icon, label }, i) => (
            <Reveal key={type} delay={i * 60} className="shrink-0 sm:shrink">
            <Link
              to={`/properties?type=${type}`}
              className="group flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-accent-600 hover:shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent-50 text-accent-700 transition group-hover:bg-accent-600 group-hover:text-white dark:bg-accent-600/15 dark:text-accent-400">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-x mt-20">
        <SectionHeader eyebrow="Hand-picked" title={t('featured')} action={<ViewAll to="/properties" />} />
        <Grid query={featured} />
      </section>

      {/* Localities */}
      <section className="mt-24 bg-white py-20 dark:bg-slate-900">
        <div className="container-x">
          <SectionHeader
            eyebrow="Neighbourhoods"
            title={`Explore ${singleCity ? singleCity.name : ''} by locality`}
            subtitle="From the beaches of ECR to the IT corridor on OMR — pick an area to see what's available."
            action={<ViewAll to="/properties" />}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {areas.map((a, i) => (
              <Reveal key={`${a.city}|${a.name}`} delay={stagger(i, 4, 60)}>
              <Link
                to={`/properties?locality=${encodeURIComponent(a.name)}${singleCity ? '' : `&city=${a.city}`}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 px-5 py-4 transition hover:border-slate-900 hover:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-100 dark:hover:bg-slate-100"
              >
                <span>
                  <span className="block font-display text-lg leading-tight text-slate-900 group-hover:text-white dark:text-slate-100 dark:group-hover:text-slate-900">{a.name}</span>
                  <span className="text-xs text-slate-500 group-hover:text-white/70 dark:group-hover:text-slate-600">{a.pincode}</span>
                </span>
                <ArrowUpRight className="size-4 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-400" />
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x mt-24">
        <SectionHeader eyebrow="Just listed" title={t('latest')} action={<ViewAll to="/properties?sort=newest" />} />
        <Grid query={latest} />
      </section>

      {/* How it works */}
      <section className="container-x mt-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <Reveal>
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="text-[34px] leading-tight sm:text-[44px]">Talk to owners,<br className="hidden sm:block" /> not middlemen.</h2>
            <p className="mt-4 max-w-md text-slate-500 dark:text-slate-400">
              Every listing is checked by our team before it goes live. When you find the one, reveal the owner's number and call them directly.
            </p>
          </Reveal>
          <ol className="space-y-8">
            {[
              ['Browse verified homes', 'Search by locality, budget and amenities, or open the map and look around you. Nothing goes live without a review.'],
              [`Unlock contacts — ${freeCredits ?? 7} on us`, 'Spend one credit to see an owner\'s phone, WhatsApp and email. Re-opening a contact you unlocked is always free.'],
              ['Visit and close directly', 'Message in-app, book a site visit and negotiate with the owner. Need more contacts? 100 for ₹999.'],
            ].map(([title, text], i) => (
              <Reveal as="li" key={title} delay={i * 120} className="flex gap-5">
                <span className="font-display text-4xl leading-none text-accent-600 dark:text-accent-400">0{i + 1}</span>
                <div className="border-b border-slate-200 pb-8 dark:border-slate-800">
                  <h3 className="text-xl">{title}</h3>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">{text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Owner CTA */}
      <section className="container-x mt-24">
        <Reveal className="relative overflow-hidden rounded-[28px] bg-brand-900 px-8 py-12 text-white sm:px-14 sm:py-16">
          <div className="absolute -right-24 -top-24 size-72 rounded-full border border-white/10" aria-hidden />
          <div className="absolute -right-10 -top-10 size-44 rounded-full border border-white/10" aria-hidden />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-xl">
              <p className="eyebrow mb-3 text-accent-400">For owners &amp; agents</p>
              <h2 className="text-[32px] leading-tight sm:text-[42px]">List your property for free.</h2>
              <p className="mt-3 text-white/75">Reach genuine buyers and tenants in {cityNames}. Get leads in-app and track views, unlocks and visits from your dashboard.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/emi-calculator" className="btn border border-white/25 text-white hover:bg-white/10"><Calculator className="size-4" /> EMI calculator</Link>
              <Link to="/post-property" className="btn-primary px-6 py-3">{t('postProperty')} <ArrowRight className="size-4" /></Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
