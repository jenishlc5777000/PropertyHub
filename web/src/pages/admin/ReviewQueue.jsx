import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bath, BedDouble, Check, ClipboardCheck, Clock, ExternalLink, Mail, MapPin, Maximize, Phone, RefreshCw, Sofa, X } from 'lucide-react';
import { apiErrorMessage, formatINR, formatPriceShort, titleCase } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../hooks/useData';
import MapView from '../../components/MapView';
import { EmptyState, ErrorState, ListSkeleton, Modal, Spinner } from '../../components/ui';

const REJECT_REASONS = [
  'Photos are unclear or not of the actual property',
  'Price or details look incorrect',
  'Duplicate of an existing listing',
  'Phone number or email written in the description',
  'Location pin does not match the address',
  'Outside our current service area',
];

const ago = (d) => {
  const h = Math.round((Date.now() - new Date(d)) / 3600000);
  return h < 1 ? 'just now' : h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <Icon className="size-4 text-accent-600" />
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

/** Everything an admin needs to decide on one listing, with approve / reject actions. */
function ReviewPanel({ p, onApprove, onReject, busy }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState(0);
  const { cities } = useConfig();
  const cityLive = cities.some((c) => c.name === p.address.city);
  const resubmitted = Boolean(p.approvedAt);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="min-w-0 space-y-3">
        <img src={p.images[photo]?.url} alt={p.title} className="aspect-[4/3] w-full rounded-xl object-cover" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {p.images.map((img, i) => (
            <button key={img.url} onClick={() => setPhoto(i)} className={`shrink-0 overflow-hidden rounded-lg ring-2 ${i === photo ? 'ring-accent-500' : 'ring-transparent'}`}>
              <img src={img.url} alt={`Photo ${i + 1}`} className="h-16 w-20 object-cover" />
            </button>
          ))}
        </div>
        <MapView properties={[p]} single className="h-56" />
        <p className="text-xs text-slate-500">
          Pin: {p.lat?.toFixed(5)}, {p.lng?.toFixed(5)} — check it matches {p.address.locality}.
        </p>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className={`chip ${p.purpose === 'rent' ? 'bg-sky-100 text-sky-700' : 'bg-brand-100 text-brand-800'}`}>{p.purpose === 'rent' ? 'For rent' : 'For sale'}</span>
          <span className="chip bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{titleCase(p.type)}</span>
          {resubmitted && <span className="chip bg-amber-100 text-amber-800"><RefreshCw className="size-3" /> Edited after approval</span>}
          {!cityLive && <span className="chip bg-red-100 text-red-700">{p.address.city} is not live</span>}
        </div>
        <div>
          <h3 className="text-xl font-bold">{p.title}</h3>
          <p className="mt-1 text-2xl font-extrabold text-brand-900 dark:text-white">
            {formatINR(p.price)}
            {p.purpose === 'rent' && <span className="text-sm font-normal text-slate-500"> /month</span>}
          </p>
          <p className="mt-1 flex items-start gap-1 text-sm text-slate-500">
            <MapPin className="mt-0.5 size-4 shrink-0" /> {p.address.line}, {p.address.locality}, {p.address.city} {p.address.pincode}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {p.bedrooms > 0 && <Fact icon={BedDouble} label="Bedrooms" value={p.bedrooms} />}
          {p.bathrooms > 0 && <Fact icon={Bath} label="Bathrooms" value={p.bathrooms} />}
          <Fact icon={Maximize} label="Area" value={`${p.areaSqft.toLocaleString('en-IN')} sq.ft`} />
          <Fact icon={Sofa} label="Furnishing" value={titleCase(p.furnishing)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Description</p>
          <p className="max-h-40 overflow-y-auto whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{p.description}</p>
        </div>
        {p.amenities?.length > 0 && <p className="text-sm text-slate-500"><b className="text-slate-700 dark:text-slate-200">Amenities:</b> {p.amenities.map(titleCase).join(', ')}</p>}
        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <p className="font-semibold">Posted by {p.owner?.name}</p>
          <p className="mt-1 flex items-center gap-2 text-slate-500"><Phone className="size-3.5" /> {p.contact.phone} · WhatsApp {p.contact.whatsapp}</p>
          <p className="flex items-center gap-2 text-slate-500"><Mail className="size-3.5" /> {p.contact.email}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-400"><Clock className="size-3.5" /> Submitted {ago(p.updatedAt)}</p>
        </div>

        {!rejecting ? (
          <div className="flex gap-2">
            <button className="btn-primary flex-1 py-3" disabled={busy} onClick={onApprove}>
              {busy ? <Spinner className="size-4" /> : <Check className="size-4" />} Approve &amp; publish
            </button>
            <button className="btn-outline flex-1 py-3 text-red-600" disabled={busy} onClick={() => setRejecting(true)}>
              <X className="size-4" /> Reject
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-red-200 p-3 dark:border-red-500/30">
            <p className="text-sm font-semibold">Reason (sent to the owner)</p>
            <div className="flex flex-wrap gap-1.5">
              {REJECT_REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} className={`chip border ${reason === r ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                  {r}
                </button>
              ))}
            </div>
            <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or write your own reason" maxLength={300} />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setRejecting(false)}>Back</button>
              <button className="btn-danger flex-1" disabled={busy || !reason.trim()} onClick={() => onReject(reason.trim())}>
                {busy && <Spinner className="size-4" />} Reject listing
              </button>
            </div>
          </div>
        )}
        <Link to={`/property/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-accent-600 hover:underline">
          Preview as the owner sees it <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

/** Listings submitted by owners/agents wait here (oldest first) until an admin approves or rejects them. */
export default function ReviewQueue() {
  const toast = useToast();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState(null);
  const q = useQuery({ queryKey: ['adminProps', 'pending'], queryFn: () => api.admin.properties({ status: 'pending', limit: 50 }), refetchInterval: 60_000 });
  const items = q.data?.items || [];
  const current = items.find((p) => p._id === openId);

  const after = (msg, id) => {
    toast(msg, 'success');
    // Move straight on to the next listing in the queue.
    const idx = items.findIndex((p) => p._id === id);
    const next = items[idx + 1] || items[idx - 1];
    setOpenId(next && next._id !== id ? next._id : null);
    ['adminProps', 'adminStats', 'properties', 'featured'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const approve = useMutation({ mutationFn: api.admin.approve, onSuccess: (_d, id) => after('Approved — the ad is now live in listings', id), onError: (e) => toast(apiErrorMessage(e), 'error') });
  const reject = useMutation({ mutationFn: ({ id, reason }) => api.admin.reject(id, reason), onSuccess: (_d, v) => after('Rejected — the owner has been notified', v.id), onError: (e) => toast(apiErrorMessage(e), 'error') });
  const busy = approve.isPending || reject.isPending;

  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!items.length) {
    return <EmptyState icon={ClipboardCheck} title="All caught up" text="New ads posted by owners and agents appear here. They go live in listings only after you approve them." />;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">
        {q.data.meta.total} ad{q.data.meta.total === 1 ? '' : 's'} waiting · oldest first. Approved ads appear in listings immediately; rejected ads go back to the owner with your reason.
      </p>
      <div className="space-y-3">
        {items.map((p) => (
          <div key={p._id} className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
            <img src={p.images[0]?.url} alt="" className="h-24 w-full rounded-lg object-cover md:w-32" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="chip bg-amber-100 text-amber-800"><Clock className="size-3" /> {ago(p.updatedAt)}</span>
                {p.approvedAt && <span className="chip bg-slate-100 text-slate-600">Re-submitted</span>}
                <span className="text-slate-500">{p.images.length} photos</span>
              </div>
              <p className="mt-1 truncate font-semibold">{p.title}</p>
              <p className="text-sm text-slate-500">
                {formatPriceShort(p.price)} · {titleCase(p.type)} for {p.purpose} · {p.address.locality}, {p.address.city} · by {p.owner?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-dark py-2" onClick={() => setOpenId(p._id)}>Review</button>
              <button className="btn-primary py-2" disabled={busy} onClick={() => approve.mutate(p._id)} title="Approve without opening">
                <Check className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={Boolean(current)} onClose={() => setOpenId(null)} title={`Review listing ${items.indexOf(current) + 1} of ${items.length}`} size="max-w-5xl">
        {current && (
          <ReviewPanel
            key={current._id}
            p={current}
            busy={busy}
            onApprove={() => approve.mutate(current._id)}
            onReject={(reason) => reject.mutate({ id: current._id, reason })}
          />
        )}
      </Modal>
    </div>
  );
}
