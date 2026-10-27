import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Mail, MessageCircle, Phone, Unlock } from 'lucide-react';
import { formatPriceShort, whatsappLink } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { CreditBadge } from '../../components/Layout';
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Seo, Spinner } from '../../components/ui';

export default function UnlockedContacts() {
  const { t } = useTranslation();
  const q = useInfiniteQuery({
    queryKey: ['unlocked'],
    queryFn: ({ pageParam }) => api.credits.unlocked({ page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
  const rows = q.data?.pages.flatMap((p) => p.items) || [];

  return (
    <div className="container-x py-8">
      <Seo title={t('unlockedContacts')} noindex />
      <PageHeader title={t('unlockedContacts')} subtitle="Contacts you've unlocked stay unlocked forever — no extra credits to view again." actions={<CreditBadge />} />
      {q.isLoading ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !rows.length ? (
        <EmptyState icon={Unlock} title="No unlocked contacts yet" text="Use “Show contact” on any listing to reach the owner directly." action={<Link to="/properties" className="btn-primary">{t('listings')}</Link>} />
      ) : (
        <div className="space-y-3">
          {rows.map(({ _id, property: p, unlockedAt, creditType }) => (
            <div key={_id} className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
              {p ? (
                <>
                  <Link to={`/property/${p.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <img src={p.images[0]?.url} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold hover:text-accent-600">{p.title}</p>
                      <p className="text-sm text-slate-500">{formatPriceShort(p.price)} · {p.address.locality}, {p.address.city}</p>
                      <p className="text-xs text-slate-400">
                        {p.contact.name} · Unlocked {new Date(unlockedAt).toLocaleDateString('en-IN')} · {creditType} credit
                      </p>
                    </div>
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:${p.contact.phone}`} className="btn-dark py-2"><Phone className="size-4" /> {p.contact.phone}</a>
                    <a href={whatsappLink(p.contact.whatsapp)} target="_blank" rel="noreferrer" className="btn bg-[#25D366] py-2 text-white"><MessageCircle className="size-4" /></a>
                    {p.contact.email && <a href={`mailto:${p.contact.email}`} className="btn-outline py-2"><Mail className="size-4" /></a>}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">This listing has been removed by the owner.</p>
              )}
            </div>
          ))}
          {q.hasNextPage && (
            <div className="flex justify-center pt-4">
              <button className="btn-outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {q.isFetchingNextPage && <Spinner className="size-4" />} Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
