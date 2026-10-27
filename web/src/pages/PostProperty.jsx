import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImagePlus, Trash2, UserCheck } from 'lucide-react';
import { AMENITIES, CITIES, FURNISHING, MAX_IMAGES, PROPERTY_TYPES, apiErrorMessage, formatINR, propertySchema, titleCase, zodFieldErrors } from '@propertyhub/shared';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LocationPicker from '../components/LocationPicker';
import { Field, PageLoader, Seo, Spinner } from '../components/ui';

const STEPS = ['Basics', 'Location', 'Details', 'Photos'];
const STEP_FIELDS = [
  ['title', 'type', 'purpose', 'price', 'areaSqft', 'bedrooms', 'bathrooms', 'furnishing'],
  ['address.line', 'address.locality', 'address.city', 'address.state', 'address.pincode', 'lat', 'lng'],
  ['description', 'amenities', 'contactPhone', 'contactWhatsapp', 'contactEmail'],
  [],
];

const empty = {
  title: '', type: 'apartment', purpose: 'sale', price: '', areaSqft: '', bedrooms: 2, bathrooms: 2, furnishing: 'semi-furnished',
  address: { line: '', locality: '', city: '', state: '', pincode: '' }, lat: null, lng: null,
  description: '', amenities: [], contactPhone: '', contactWhatsapp: '', contactEmail: '',
};

function BecomeAgent() {
  const { setUser } = useAuth();
  const toast = useToast();
  const m = useMutation({
    mutationFn: api.users.becomeAgent,
    onSuccess: (u) => {
      setUser(u);
      toast('You can now post properties!', 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  return (
    <div className="container-x py-16">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <UserCheck className="mx-auto size-12 text-accent-600" />
        <h1 className="mt-4 text-2xl font-bold">List your property for free</h1>
        <p className="mt-2 text-slate-500">Switch your account to Owner / Agent to post listings, receive leads and track performance. You can still browse and unlock contacts.</p>
        <button className="btn-primary mt-6" onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending && <Spinner className="size-4" />} I'm an owner / agent
        </button>
      </div>
    </div>
  );
}

export default function PostProperty() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState([]);
  const [removed, setRemoved] = useState([]);

  const editing = useQuery({ queryKey: ['property', id], queryFn: () => api.properties.get(id), enabled: Boolean(id) });
  useEffect(() => {
    const p = editing.data;
    if (!p) return;
    setF({
      title: p.title, type: p.type, purpose: p.purpose, price: p.price, areaSqft: p.areaSqft, bedrooms: p.bedrooms, bathrooms: p.bathrooms,
      furnishing: p.furnishing, address: { ...empty.address, ...p.address }, lat: p.lat, lng: p.lng, description: p.description,
      amenities: p.amenities || [], contactPhone: p.contact?.phone || '', contactWhatsapp: p.contact?.whatsapp || '', contactEmail: p.contact?.email || '',
    });
    setExisting(p.images || []);
  }, [editing.data]);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const save = useMutation({
    mutationFn: (fd) => (id ? api.properties.update(id, fd) : api.properties.create(fd)),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['myListings'] });
      qc.invalidateQueries({ queryKey: ['property'] });
      toast(p.status === 'pending' ? 'Submitted! Your listing will go live after a quick review.' : 'Listing saved.', 'success');
      nav('/account/listings');
    },
    onError: (e) => {
      const details = e.response?.data?.error?.details;
      if (details) setErrs(details);
      toast(apiErrorMessage(e), 'error');
    },
  });

  if (!user || user.role === 'buyer') return <BecomeAgent />;
  if (id && editing.isLoading) return <PageLoader />;

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setAddr = (k, v) => setF((x) => ({ ...x, address: { ...x.address, [k]: v } }));
  const keptImages = existing.filter((i) => !removed.includes(i.url));
  const totalImages = keptImages.length + files.length;
  const noRooms = f.type === 'plot' || f.type === 'commercial';

  const validateStep = (s) => {
    const r = propertySchema.safeParse(f);
    const all = r.success ? {} : zodFieldErrors(r.error);
    const fields = s === 'all' ? Object.keys(all) : STEP_FIELDS[s];
    const stepErrs = Object.fromEntries(Object.entries(all).filter(([k]) => fields.some((fl) => k === fl || k.startsWith(fl))));
    if ((s === 1 || s === 'all') && (f.lat == null || f.lng == null)) stepErrs.lat = 'Drop a pin on the map';
    if ((s === 3 || s === 'all') && totalImages === 0) stepErrs.images = 'Add at least one photo';
    setErrs(stepErrs);
    return stepErrs;
  };

  const next = () => Object.keys(validateStep(step)).length === 0 && setStep((s) => s + 1);

  const submit = () => {
    const bad = Object.keys(validateStep('all'));
    if (bad.length) {
      const firstBad = STEP_FIELDS.findIndex((fields) => fields.some((fl) => bad.some((k) => k.startsWith(fl))));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    const data = propertySchema.parse(f);
    const fd = new FormData();
    fd.append('data', JSON.stringify(id ? { ...data, removeImages: removed } : data));
    files.forEach((file) => fd.append('images', file));
    save.mutate(fd);
  };

  const addFiles = (list) => {
    const ok = [...list].filter((x) => /image\/(jpeg|png|webp)/.test(x.type) && x.size <= 5 * 1024 * 1024);
    if (ok.length < list.length) toast('Some files were skipped (JPG/PNG/WEBP up to 5 MB only)', 'error');
    setFiles((cur) => [...cur, ...ok].slice(0, MAX_IMAGES - keptImages.length));
  };

  return (
    <div className="container-x max-w-3xl py-8">
      <Seo title={id ? 'Edit property' : t('postProperty')} noindex />
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{id ? t('edit') : t('postProperty')}</h1>

      <ol className="my-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${i < step ? 'bg-accent-600 text-white' : i === step ? 'bg-brand-900 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={`hidden text-sm font-medium sm:inline ${i === step ? '' : 'text-slate-500'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />}
          </li>
        ))}
      </ol>

      <div className="card space-y-5 p-6">
        {step === 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {['sale', 'rent'].map((p) => (
                <button type="button" key={p} onClick={() => set('purpose', p)} className={`rounded-lg py-2 text-sm font-semibold ${f.purpose === p ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'}`}>
                  {p === 'sale' ? 'Sell' : 'Rent out'}
                </button>
              ))}
            </div>
            <Field label={t('type')} error={errs.type}>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((ty) => (
                  <button type="button" key={ty} onClick={() => set('type', ty)} className={`chip border px-4 py-2 text-sm ${f.type === ty ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                    {titleCase(ty)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Title" error={errs.title} hint="e.g. Spacious 3 BHK with park view in Koramangala">
              <input className="input" value={f.title} maxLength={120} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`${t('price')} (₹)${f.purpose === 'rent' ? ' / month' : ''}`} error={errs.price} hint={f.price ? formatINR(f.price) : undefined}>
                <input type="number" min="0" inputMode="numeric" className="input" value={f.price} onChange={(e) => set('price', e.target.value)} />
              </Field>
              <Field label={`${t('area')} (${t('sqft')})`} error={errs.areaSqft}>
                <input type="number" min="0" inputMode="numeric" className="input" value={f.areaSqft} onChange={(e) => set('areaSqft', e.target.value)} />
              </Field>
              {!noRooms && (
                <>
                  <Field label={t('bedrooms')} error={errs.bedrooms}>
                    <input type="number" min="0" max="20" className="input" value={f.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
                  </Field>
                  <Field label={t('bathrooms')} error={errs.bathrooms}>
                    <input type="number" min="0" max="20" className="input" value={f.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} />
                  </Field>
                </>
              )}
              <Field label={t('furnishing')}>
                <select className="input" value={f.furnishing} onChange={(e) => set('furnishing', e.target.value)}>
                  {FURNISHING.map((x) => <option key={x} value={x}>{titleCase(x)}</option>)}
                </select>
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('city')} error={errs['address.city']}>
                <select
                  className="input"
                  value={f.address.city}
                  onChange={(e) => {
                    const c = CITIES.find((x) => x.name === e.target.value);
                    setF((x) => ({ ...x, address: { ...x.address, city: e.target.value, state: c?.state || x.address.state }, lat: x.lat ?? c?.lat, lng: x.lng ?? c?.lng }));
                  }}
                >
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <Field label={t('locality')} error={errs['address.locality']}>
                <input className="input" value={f.address.locality} onChange={(e) => setAddr('locality', e.target.value)} />
              </Field>
              <Field label="Address line" error={errs['address.line']}>
                <input className="input" value={f.address.line} onChange={(e) => setAddr('line', e.target.value)} placeholder="Flat / building, street" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="State" error={errs['address.state']}>
                  <input className="input" value={f.address.state} onChange={(e) => setAddr('state', e.target.value)} />
                </Field>
                <Field label="Pincode" error={errs['address.pincode']}>
                  <input className="input" inputMode="numeric" maxLength={6} value={f.address.pincode} onChange={(e) => setAddr('pincode', e.target.value.replace(/\D/g, ''))} />
                </Field>
              </div>
            </div>
            <Field label={t('location')} error={errs.lat || errs.lng}>
              <LocationPicker
                lat={f.lat}
                lng={f.lng}
                onChange={(lat, lng) => setF((x) => ({ ...x, lat, lng }))}
                addressQuery={[f.address.line, f.address.locality, f.address.city, f.address.pincode].filter(Boolean).join(', ')}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={t('description')} error={errs.description} hint={`${f.description.length}/5000 — mention nearby schools, transport, floor, facing, parking…`}>
              <textarea className="input min-h-40" maxLength={5000} value={f.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <Field label={t('amenities')}>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => {
                  const on = f.amenities.includes(a);
                  return (
                    <button type="button" key={a} onClick={() => set('amenities', on ? f.amenities.filter((x) => x !== a) : [...f.amenities, a])} className={`chip border px-3 py-1.5 text-sm ${on ? 'border-accent-600 bg-accent-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                      {titleCase(a)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                Contact shown to buyers after they unlock (optional — defaults to your profile: {user.phone}). Buyers always see it masked until they spend a credit.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t('phone')} error={errs.contactPhone}>
                  <input className="input" inputMode="numeric" maxLength={10} value={f.contactPhone} onChange={(e) => set('contactPhone', e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label={t('whatsapp')} error={errs.contactWhatsapp}>
                  <input className="input" inputMode="numeric" maxLength={10} value={f.contactWhatsapp} onChange={(e) => set('contactWhatsapp', e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label={t('email')} error={errs.contactEmail}>
                  <input className="input" type="email" value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
                </Field>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Field label={`Photos (${totalImages}/${MAX_IMAGES})`} error={errs.images}>
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-accent-500 dark:border-slate-700"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
              >
                <ImagePlus className="size-10 text-slate-400" />
                <span className="mt-2 text-sm font-medium">Click or drag photos here</span>
                <span className="text-xs text-slate-500">JPG, PNG or WEBP · max 5 MB each · first photo is the cover</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={totalImages >= MAX_IMAGES} onChange={(e) => addFiles(e.target.files)} />
              </label>
            </Field>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {keptImages.map((img) => (
                <div key={img.url} className="group relative aspect-square overflow-hidden rounded-lg">
                  <img src={img.url} alt="" className="size-full object-cover" />
                  <button type="button" onClick={() => setRemoved((r) => [...r, img.url])} className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white" aria-label="Remove photo">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {previews.map((p, i) => (
                <div key={p.url} className="relative aspect-square overflow-hidden rounded-lg ring-2 ring-accent-500">
                  <img src={p.url} alt="" className="size-full object-cover" />
                  <button type="button" onClick={() => setFiles((fs) => fs.filter((_, k) => k !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white" aria-label="Remove photo">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
              <p className="font-semibold">{f.title || 'Untitled'}</p>
              <p className="text-slate-500">
                {titleCase(f.type)} for {f.purpose} · {f.price ? formatINR(f.price) : '—'} · {f.areaSqft || '—'} sq.ft · {f.address.locality}, {f.address.city}
              </p>
              {Object.keys(errs).length > 0 && <p className="mt-2 text-red-600">Please fix the highlighted fields in earlier steps.</p>}
            </div>
          </>
        )}

        <div className="flex justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
          <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{t('back')}</button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={next}>{t('next')}</button>
          ) : (
            <button type="button" className="btn-primary" onClick={submit} disabled={save.isPending}>
              {save.isPending && <Spinner className="size-4" />} {id ? t('save') : t('submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
