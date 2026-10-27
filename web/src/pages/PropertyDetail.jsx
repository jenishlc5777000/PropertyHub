import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bath, BedDouble, Calendar, Check, Compass, Eye, Home as HomeIcon, MapPin, Maximize, Share2, Sofa } from 'lucide-react';
import { apiErrorMessage, formatINR, inquirySchema, titleCase, visitSchema, zodFieldErrors } from '@propertyhub/shared';
import { api, SITE_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Gallery from '../components/Gallery';
import MapView from '../components/MapView';
import EmiCalculator from '../components/EmiCalculator';
import PropertyCard, { FavoriteButton, PriceTag } from '../components/PropertyCard';
import ShowContactButton from '../components/ShowContact';
import { ErrorState, Field, PageLoader, Seo, Spinner, StatusBadge } from '../components/ui';
import NotFound from './NotFound';

function InquiryForm({ property }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [message, setMessage] = useState(`Hi, I'm interested in "${property.title}". Is it still available?`);
  const [err, setErr] = useState();
  const m = useMutation({
    mutationFn: api.inquiries.create,
    onSuccess: () => {
      toast('Inquiry sent! The owner will reply in your inbox.', 'success');
      setMessage('');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!user) return nav('/login', { state: { from: `/property/${property.slug}` } });
    const r = inquirySchema.safeParse({ propertyId: property._id, message });
    if (!r.success) return setErr(zodFieldErrors(r.error).message);
    setErr();
    m.mutate(r.data);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field error={err}>
        <textarea className="input min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('inquiryPlaceholder')} maxLength={1000} />
      </Field>
      <button className="btn-dark w-full" disabled={m.isPending}>{m.isPending && <Spinner className="size-4" />}{t('sendInquiry')}</button>
    </form>
  );
}

function VisitForm({ property }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [f, setF] = useState({ date: tomorrow, slot: 'morning', note: '' });
  const [errs, setErrs] = useState({});
  const m = useMutation({
    mutationFn: api.visits.create,
    onSuccess: () => toast('Visit requested. You will be notified when the owner confirms.', 'success'),
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const submit = (e) => {
    e.preventDefault();
    if (!user) return nav('/login', { state: { from: `/property/${property.slug}` } });
    const r = visitSchema.safeParse({ propertyId: property._id, ...f });
    if (!r.success) return setErrs(zodFieldErrors(r.error));
    setErrs({});
    m.mutate({ ...r.data, date: f.date });
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('visitDate')} error={errs.date}>
          <input type="date" className="input" min={tomorrow} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label={t('slot')}>
          <select className="input" value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>
            {['morning', 'afternoon', 'evening'].map((s) => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        </Field>
      </div>
      <button className="btn-outline w-full" disabled={m.isPending}>
        {m.isPending ? <Spinner className="size-4" /> : <Calendar className="size-4" />} {t('requestVisit')}
      </button>
    </form>
  );
}

export default function PropertyDetail() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const q = useQuery({ queryKey: ['property', slug], queryFn: () => api.properties.get(slug) });
  const p = q.data;
  const similar = useQuery({ queryKey: ['similar', p?._id], queryFn: () => api.properties.similar(p._id), enabled: Boolean(p?._id) });

  if (q.isLoading) return <PageLoader />;
  if (q.isError) return q.error?.response?.status === 404 ? <NotFound /> : <div className="container-x py-10"><ErrorState error={q.error} onRetry={q.refetch} /></div>;

  const url = `${SITE_URL}/property/${p.slug}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard', 'success');
      }
    } catch {
      /* user cancelled */
    }
  };

  const facts = [
    p.bedrooms > 0 && { icon: BedDouble, label: t('bedrooms'), value: p.bedrooms },
    p.bathrooms > 0 && { icon: Bath, label: t('bathrooms'), value: p.bathrooms },
    { icon: Maximize, label: t('area'), value: `${p.areaSqft.toLocaleString('en-IN')} ${t('sqft')}` },
    { icon: Sofa, label: t('furnishing'), value: titleCase(p.furnishing) },
    { icon: HomeIcon, label: t('type'), value: titleCase(p.type) },
    { icon: Eye, label: t('views'), value: p.views },
  ].filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    url,
    image: p.images.map((i) => i.url),
    datePosted: p.createdAt,
    offers: { '@type': 'Offer', price: p.price, priceCurrency: 'INR' },
    address: { '@type': 'PostalAddress', addressLocality: p.address.locality, addressRegion: p.address.state, postalCode: p.address.pincode, addressCountry: 'IN' },
  };

  return (
    <div className="container-x py-6">
      <Seo title={`${p.title} – ${formatINR(p.price)}`} description={p.description.slice(0, 155)} image={p.images[0]?.url} path={`/property/${p.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <nav className="mb-4 text-sm text-slate-500">
        <Link to="/" className="hover:underline">{t('home')}</Link> /{' '}
        <Link to={`/properties?city=${p.address.city}`} className="hover:underline">{p.address.city}</Link> /{' '}
        <span className="text-slate-700 dark:text-slate-300">{p.address.locality}</span>
      </nav>

      {p.status !== 'approved' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <StatusBadge status={p.status} />
          {p.status === 'pending' && 'This listing is awaiting admin review and is not public yet.'}
          {p.status === 'rejected' && `Rejected: ${p.rejectionReason || ''}`}
        </div>
      )}

      <Gallery images={p.images} title={p.title} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className={`chip ${p.purpose === 'rent' ? 'bg-sky-100 text-sky-700' : 'bg-brand-100 text-brand-800'}`}>{p.purpose === 'rent' ? t('forRent') : t('forSale')}</span>
                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{p.title}</h1>
                <p className="mt-1 flex items-center gap-1 text-slate-500"><MapPin className="size-4" /> {p.address.line}, {p.address.locality}, {p.address.city} {p.address.pincode}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={share} className="btn-outline p-2.5" aria-label={t('share')}><Share2 className="size-4" /></button>
                <FavoriteButton id={p._id} className="size-10 border border-slate-300 dark:border-slate-700" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <PriceTag p={p} className="text-3xl font-extrabold text-brand-900 dark:text-white" />
              <span className="text-sm text-slate-500">{formatINR(p.price)}</span>
              {p.previousPrice > p.price && <span className="text-sm text-slate-400 line-through">{formatINR(p.previousPrice)}</span>}
            </div>
            {p.purpose === 'sale' && p.areaSqft > 0 && <p className="text-sm text-slate-500">{formatINR(Math.round(p.price / p.areaSqft))} / {t('sqft')}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="card flex items-center gap-3 p-4">
                <Icon className="size-5 text-accent-600" />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <section>
            <h2 className="mb-2 text-lg font-bold">{t('description')}</h2>
            <p className="whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300">{p.description}</p>
          </section>

          {p.amenities?.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">{t('amenities')}</h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {p.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm"><Check className="size-4 text-accent-600" /> {titleCase(a)}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Compass className="size-5" /> {t('location')}</h2>
            <MapView properties={[p]} single className="h-80" />
            <a href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-accent-600 hover:underline">
              Open in OpenStreetMap ↗
            </a>
          </section>

          {p.purpose === 'sale' && (
            <section className="card p-6">
              <h2 className="mb-4 text-lg font-bold">{t('emiCalculator')}</h2>
              <EmiCalculator price={p.price} />
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <Link to={`/agents/${p.owner._id}`} className="mb-4 flex items-center gap-3">
              {p.owner.avatar ? (
                <img src={p.owner.avatar} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <span className="grid size-12 place-items-center rounded-full bg-brand-900 text-lg font-bold text-white">{p.owner.name?.[0]}</span>
              )}
              <div>
                <p className="font-semibold hover:underline">{p.owner.name}</p>
                <p className="text-xs capitalize text-slate-500">{p.owner.role === 'agent' ? 'Owner / Agent' : p.owner.role}</p>
              </div>
            </Link>
            <ShowContactButton property={p} />
            {p.contact?.masked && <p className="mt-2 text-center text-xs text-slate-500">✉ {p.contact.email} · revealed after unlock</p>}
          </div>
          {!p.isOwner && p.status === 'approved' && (
            <>
              <div className="card p-5">
                <h3 className="mb-3 font-semibold">{t('sendInquiry')}</h3>
                <InquiryForm property={p} />
              </div>
              <div className="card p-5">
                <h3 className="mb-3 font-semibold">{t('requestVisit')}</h3>
                <VisitForm property={p} />
              </div>
            </>
          )}
          {p.isOwner && (
            <Link to={`/edit-property/${p._id}`} className="btn-outline w-full">{t('edit')}</Link>
          )}
        </aside>
      </div>

      {similar.data?.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-1 text-2xl font-bold">{t('similar')}</h2>
          <p className="mb-6 text-sm text-slate-500">Same budget, within 10 km of this property</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.data.slice(0, 3).map((s) => <PropertyCard key={s._id} p={s} />)}
          </div>
        </section>
      )}
    </div>
  );
}
