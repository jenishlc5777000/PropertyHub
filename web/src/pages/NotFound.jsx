import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Seo } from '../components/ui';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Seo title={t('notFound')} noindex />
      <p className="text-7xl font-extrabold text-accent-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t('notFound')}</h1>
      <p className="mt-2 text-slate-500">The page or property you're looking for may have been removed or never existed.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">{t('goHome')}</Link>
        <Link to="/properties" className="btn-outline">{t('listings')}</Link>
      </div>
    </div>
  );
}
