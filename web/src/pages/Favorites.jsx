import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { api } from '../lib/api';
import PropertyCard from '../components/PropertyCard';
import { EmptyState, ErrorState, GridSkeleton, PageHeader, Seo } from '../components/ui';

export default function Favorites() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['favorites'], queryFn: api.favorites.list });
  return (
    <div className="container-x py-8">
      <Seo title={t('favorites')} noindex />
      <PageHeader title={t('favorites')} subtitle="Saved properties sync across the website and the app. You'll be notified when prices drop." />
      {q.isLoading ? (
        <GridSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !q.data.length ? (
        <EmptyState icon={Heart} title="No saved properties yet" text="Tap the heart on any listing to save it here." action={<Link to="/properties" className="btn-primary">{t('listings')}</Link>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((p) => <PropertyCard key={p._id} p={p} />)}
        </div>
      )}
    </div>
  );
}
