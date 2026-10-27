import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Calendar, Eye, Heart, MessageSquare, Pencil, Plus, Trash2, Unlock } from 'lucide-react';
import { apiErrorMessage, formatPriceShort } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { EmptyState, ErrorState, ListSkeleton, Modal, PageHeader, Seo, StatusBadge } from '../../components/ui';

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card p-4">
      <Icon className="size-5 text-accent-600" />
      <p className="mt-2 text-2xl font-bold">{value ?? '–'}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export default function MyListings() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const stats = useQuery({ queryKey: ['agentStats'], queryFn: api.agent.stats });
  const q = useQuery({ queryKey: ['myListings', status], queryFn: () => api.properties.mine({ status: status || undefined, limit: 50 }) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['myListings'] });
    qc.invalidateQueries({ queryKey: ['agentStats'] });
  };
  const setSt = useMutation({
    mutationFn: ({ id, s }) => api.properties.setStatus(id, s),
    onSuccess: () => { refresh(); toast('Status updated', 'success'); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const del = useMutation({
    mutationFn: api.properties.remove,
    onSuccess: () => { refresh(); setConfirmDelete(null); toast('Listing deleted', 'success'); },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const s = stats.data;
  return (
    <div className="container-x py-8">
      <Seo title={t('myListings')} noindex />
      <PageHeader title={t('dashboard')} subtitle="Track your listings, leads and visits" actions={<Link to="/post-property" className="btn-primary"><Plus className="size-4" /> {t('postProperty')}</Link>} />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={Building2} label={t('activeListings')} value={s?.byStatus?.approved ?? 0} />
        <Stat icon={Eye} label={t('views')} value={s?.views} />
        <Stat icon={Unlock} label={t('unlocks')} value={s?.unlocks} />
        <Stat icon={MessageSquare} label={t('leads')} value={s?.inquiries} />
        <Stat icon={Calendar} label="Upcoming visits" value={s?.upcomingVisits} />
        <Stat icon={Heart} label="Saved by buyers" value={s?.favorites} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'approved', 'pending', 'rejected', 'sold', 'rented'].map((st) => (
          <button key={st} onClick={() => setStatus(st)} className={`chip border px-3 py-1.5 text-sm ${status === st ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
            {st ? t(`status_${st}`) : 'All'} {st && s?.byStatus?.[st] ? `(${s.byStatus[st]})` : ''}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !q.data.items.length ? (
        <EmptyState icon={Building2} title="No listings here" text="Post your first property for free — it goes live after a quick review." action={<Link to="/post-property" className="btn-primary">{t('postProperty')}</Link>} />
      ) : (
        <div className="space-y-3">
          {q.data.items.map((p) => (
            <div key={p._id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <Link to={`/property/${p.slug}`} className="shrink-0">
                <img src={p.images[0]?.url} alt="" className="h-24 w-full rounded-lg object-cover sm:w-36" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.status} />
                  {p.featured && <span className="chip bg-amber-100 text-amber-800">Featured</span>}
                </div>
                <Link to={`/property/${p.slug}`} className="mt-1 block truncate font-semibold hover:text-accent-600">{p.title}</Link>
                <p className="text-sm text-slate-500">
                  {formatPriceShort(p.price)} · {p.address.locality}, {p.address.city}
                </p>
                <p className="mt-1 flex gap-4 text-xs text-slate-500">
                  <span><Eye className="mr-1 inline size-3.5" />{p.views}</span>
                  <span><Unlock className="mr-1 inline size-3.5" />{p.unlockCount}</span>
                </p>
                {p.status === 'rejected' && p.rejectionReason && <p className="mt-1 text-sm text-red-600">Reason: {p.rejectionReason}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status === 'approved' && (
                  <button className="btn-outline py-1.5" onClick={() => setSt.mutate({ id: p._id, s: p.purpose === 'rent' ? 'rented' : 'sold' })}>
                    {p.purpose === 'rent' ? t('markRented') : t('markSold')}
                  </button>
                )}
                {(p.status === 'sold' || p.status === 'rented') && (
                  <button className="btn-outline py-1.5" onClick={() => setSt.mutate({ id: p._id, s: 'approved' })}>Relist</button>
                )}
                <Link to={`/edit-property/${p._id}`} className="btn-outline p-2" aria-label={t('edit')}><Pencil className="size-4" /></Link>
                <button className="btn-outline p-2 text-red-600" onClick={() => setConfirmDelete(p)} aria-label={t('delete')}><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Delete listing?">
        <p className="text-sm text-slate-600 dark:text-slate-300">"{confirmDelete?.title}" will be permanently removed. This cannot be undone.</p>
        <div className="mt-5 flex gap-3">
          <button className="btn-outline flex-1" onClick={() => setConfirmDelete(null)}>{t('cancel')}</button>
          <button className="btn-danger flex-1" disabled={del.isPending} onClick={() => del.mutate(confirmDelete._id)}>{t('delete')}</button>
        </div>
      </Modal>
    </div>
  );
}
