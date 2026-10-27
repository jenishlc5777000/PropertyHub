import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building, Building2, Calculator, Home as HomeIcon, LandPlot, LocateFixed, MapPin, Search, ShieldCheck, Trees, Unlock, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useConfig } from '../hooks/useData';
import PropertyCard from '../components/PropertyCard';
import { ErrorState, GridSkeleton, Seo } from '../components/ui';

const TYPES = [
  { type: 'apartment', icon: Building, label: 'Apartments' },
  { type: 'villa', icon: Trees, label: 'Villas' },
  { type: 'house', icon: HomeIcon, label: 'Houses' },
  { type: 'plot', icon: LandPlot, label: 'Plots' },
  { type: 'commercial', icon: Building2, label: 'Commercial' },
];

function Section({ title, link, children }) {
  const { t } = useTranslation();
  return (
    <section className="container-x mt-16">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {link && (
          <Link to={link} className="flex items-center gap-1 text-sm font-semibold text-accent-600 hover:underline">
            {t('viewAll')} <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Grid({ query }) {
  if (query.isLoading) return <GridSkeleton count={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  const items = Array.isArray(query.data) ? query.data : query.data?.items || [];
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.slice(0, 6).map((p) => <PropertyCard key={p._id} p={p} />)}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [purpose, setPurpose] = useState('sale');
  const [q, setQ] = useState('');
  const [locality, setLocality] = useState('');
  const { cities, singleCity } = useConfig();
  const cityNames = cities.map((c) => c.name).join(', ');
  const areas = cities.flatMap((c) => c.localities.map((l) => ({ ...l, city: c.name })));
  const featured = useQuery({ queryKey: ['featured'], queryFn: api.properties.featured });
  const latest = useQuery({ queryKey: ['properties', { sort: 'newest', limit: 6, boost: '0' }], queryFn: () => api.properties.list({ sort: 'newest', limit: 6, boost: '0' }) });

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

  return (
    <>
      <Seo description={`Search verified flats, villas, houses, plots and offices for sale and rent in ${cityNames}. Talk to owners directly.`} />
      <section className="relative overflow-hidden bg-brand-900">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1800&q=70&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 size-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/40 via-brand-900/60 to-brand-900" />
        <div className="container-x relative py-20 sm:py-28">
          <span className="chip mb-4 bg-accent-600/90 py-1.5 text-white">
            <MapPin className="size-3.5" /> Now live in {cityNames}
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">{singleCity ? t('taglineCity', { city: singleCity.name }) : t('tagline')}</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-200">{t('heroSubtitle')}</p>

          <form onSubmit={search} className="mt-8 max-w-3xl rounded-2xl bg-white p-2 shadow-2xl dark:bg-slate-900">
            <div className="mb-2 flex gap-1 px-1 pt-1">
              {['sale', 'rent'].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPurpose(p)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${purpose === p ? 'bg-brand-900 text-white dark:bg-brand-600' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {p === 'sale' ? t('buy') : t('rent')}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-56">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <select value={locality} onChange={(e) => setLocality(e.target.value)} className="input pl-9" aria-label={t('locality')}>
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
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder={t('searchPlaceholder')} aria-label={t('search')} />
              </div>
              <button className="btn-primary px-6">{t('search')}</button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/properties?near=1" className="chip bg-accent-600 py-1.5 text-white hover:bg-accent-700">
              <LocateFixed className="size-3.5" /> {t('nearMe')}
            </Link>
            {areas.slice(0, 8).map((a) => (
              <Link key={`${a.city}|${a.name}`} to={`/properties?locality=${encodeURIComponent(a.name)}`} className="chip bg-white/10 py-1.5 text-white backdrop-blur hover:bg-white/20">
                {a.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x -mt-8 relative z-10">
        <div className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-5">
          {TYPES.map(({ type, icon: Icon, label }) => (
            <Link key={type} to={`/properties?type=${type}`} className="flex flex-col items-center gap-2 rounded-xl p-4 text-center transition hover:bg-slate-50 dark:hover:bg-slate-800">
              <Icon className="size-7 text-accent-600" />
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <Section title={t('featured')} link="/properties">
        <Grid query={featured} />
      </Section>

      <Section title={`Explore ${singleCity ? singleCity.name : ''} by locality`} link="/properties">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {areas.map((a) => (
            <Link
              key={`${a.city}|${a.name}`}
              to={`/properties?locality=${encodeURIComponent(a.name)}${singleCity ? '' : `&city=${a.city}`}`}
              className="card flex items-center gap-2 px-4 py-3 text-sm font-medium transition hover:border-accent-500 hover:text-accent-600"
            >
              <MapPin className="size-4 shrink-0 text-accent-600" />
              <span className="truncate">{a.name}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t('latest')} link="/properties?sort=newest">
        <Grid query={latest} />
      </Section>

      <section className="container-x mt-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Verified listings', text: 'Every listing is reviewed by our team before it goes live.' },
            { icon: Unlock, title: '7 free contacts', text: 'Reach owners and agents directly. Get 100 more for just ₹999.' },
            { icon: Users, title: 'No middlemen', text: 'Chat in-app, schedule visits and negotiate directly.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6">
              <Icon className="size-8 text-accent-600" />
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x mt-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-accent-600 to-accent-700 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold">Own a property? List it for free.</h2>
            <p className="mt-1 text-accent-100">Reach thousands of genuine buyers and tenants across India.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/emi-calculator" className="btn bg-white/15 text-white hover:bg-white/25"><Calculator className="size-4" /> EMI</Link>
            <Link to="/post-property" className="btn bg-white text-accent-700 hover:bg-accent-50">{t('postProperty')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
