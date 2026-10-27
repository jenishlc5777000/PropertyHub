import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Inbox, Loader2, X } from 'lucide-react';
import { APP_NAME } from '@propertyhub/shared';
import { SITE_URL } from '../lib/api';
import { Reveal } from './motion';

export function Spinner({ className = 'size-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-accent-600">
      <Spinner className="size-8" />
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex animate-fade-in items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card max-h-[92vh] w-full ${size} animate-sheet-up overflow-y-auto rounded-b-none p-6 sm:animate-scale-in sm:rounded-[20px]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          <button onClick={onClose} className="btn-ghost -mr-2 -mt-2 p-2" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  const { t } = useTranslation();
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 rounded-full bg-accent-50 p-4 text-accent-600 dark:bg-accent-600/10">
        <Icon className="size-8" />
      </div>
      <h3 className="text-lg font-semibold">{title || t('empty')}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  const msg = error?.response?.data?.error?.message || error?.message;
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <AlertCircle className="mb-3 size-10 text-red-500" />
      <h3 className="font-semibold">{t('errorGeneric')}</h3>
      {msg && <p className="mt-1 text-sm text-slate-500">{msg}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-4">
          {t('retry')}
        </button>
      )}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-5 w-1/2" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card flex gap-4 p-4">
          <div className="skeleton size-16 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

export function Seo({ title, description, image, path = '', noindex }) {
  const full = title ? `${title} | ${APP_NAME}` : `${APP_NAME} – Buy, Rent & Sell Property in India`;
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      {noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl leading-tight sm:text-[40px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Eyebrow + serif title + optional action on the right. */
export function SectionHeader({ eyebrow, title, subtitle, action }) {
  return (
    <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-[28px] leading-tight sm:text-[34px]">{title}</h2>
        {subtitle && <p className="mt-2 text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </Reveal>
  );
}

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  const cls = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    approved: 'bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-500',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    sold: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    rented: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    paid: 'bg-accent-100 text-accent-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-slate-200 text-slate-700',
    created: 'bg-amber-100 text-amber-800',
  }[status];
  return <span className={`chip ${cls}`}>{t(`status_${status}`, { defaultValue: status })}</span>;
}
