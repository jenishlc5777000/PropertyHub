import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import PropertyCard from '../components/PropertyCard';
import { EmptyState, ErrorState, GridSkeleton, Seo } from '../components/ui';
import NotFound from './NotFound';

export default function AgentProfile() {
  const { id } = useParams();
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['agent', id], queryFn: () => api.users.agent(id) });

  if (q.isError && q.error?.response?.status === 404) return <NotFound />;
  const a = q.data?.agent;
  return (
    <div className="container-x py-8">
      {a && <Seo title={`${a.name} – Property Agent`} description={a.bio || `Properties listed by ${a.name} on PropertyHub`} path={`/agents/${id}`} />}
      {q.isLoading ? (
        <div className="card mb-8 flex items-center gap-5 p-6">
          <div className="skeleton size-20 rounded-full" />
          <div className="flex-1 space-y-2"><div className="skeleton h-6 w-48" /><div className="skeleton h-4 w-72" /></div>
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : (
        <div className="card mb-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          {a.avatar ? (
            <img src={a.avatar} alt="" className="size-20 rounded-full object-cover" />
          ) : (
            <span className="grid size-20 place-items-center rounded-full bg-brand-900 text-3xl font-bold text-white">{a.name[0]}</span>
          )}
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold">{a.name} <BadgeCheck className="size-5 text-accent-600" /></h1>
            <p className="text-sm text-slate-500">Member since {new Date(a.createdAt).getFullYear()} · {q.data.stats.listings} active listings</p>
            {a.bio && <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">{a.bio}</p>}
          </div>
        </div>
      )}
      {a && <h2 className="mb-4 text-xl font-bold">{t('agentListings', { name: a.name })}</h2>}
      {q.isLoading ? (
        <GridSkeleton />
      ) : q.data?.listings?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.listings.map((p) => <PropertyCard key={p._id} p={p} />)}
        </div>
      ) : q.data ? (
        <EmptyState icon={Building2} title="No active listings" />
      ) : null}
    </div>
  );
}
