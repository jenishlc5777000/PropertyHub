import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Coins, Download, Gift, Receipt, Wallet } from 'lucide-react';
import { formatINR } from '@propertyhub/shared';
import { api, downloadInvoice } from '../../lib/api';
import { useBalance } from '../../hooks/useData';
import { useToast } from '../../context/ToastContext';
import { PaywallContent } from '../../components/ShowContact';
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Seo, StatusBadge } from '../../components/ui';

const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CreditsBilling() {
  const { t } = useTranslation();
  const toast = useToast();
  const bal = useBalance();
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.payments.orders });
  const b = bal.data;

  return (
    <div className="container-x py-8">
      <Seo title={t('creditsBilling')} noindex />
      <PageHeader title={t('creditsBilling')} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {bal.isLoading ? (
            <ListSkeleton rows={1} />
          ) : bal.isError ? (
            <ErrorState error={bal.error} onRetry={bal.refetch} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card bg-brand-900 p-5 text-white dark:bg-brand-800">
                <Wallet className="size-5 text-accent-500" />
                <p className="mt-3 text-3xl font-extrabold">{b.total}</p>
                <p className="text-sm text-brand-200">Total credits</p>
              </div>
              <div className="card p-5">
                <Gift className="size-5 text-accent-600" />
                <p className="mt-3 text-3xl font-extrabold">{b.free}</p>
                <p className="text-sm text-slate-500">Free · {t('neverExpires')}</p>
              </div>
              <div className="card p-5">
                <Coins className="size-5 text-accent-600" />
                <p className="mt-3 text-3xl font-extrabold">{b.paid}</p>
                <p className="text-sm text-slate-500">Paid{b.nextExpiry ? ` · next expiry ${date(b.nextExpiry)}` : ''}</p>
              </div>
            </div>
          )}

          {b?.batches?.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Paid credit batches</h2>
              <p className="mb-3 text-xs text-slate-500">Free credits are used first, then the batch that expires soonest.</p>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr><th className="py-2">Remaining</th><th>Of</th><th>Source</th><th className="text-right">Expires</th></tr>
                </thead>
                <tbody>
                  {b.batches.map((x) => {
                    const soon = new Date(x.expiresAt) - Date.now() < 14 * 86400000;
                    return (
                      <tr key={x._id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-2 font-semibold">{x.amount}</td>
                        <td>{x.initial}</td>
                        <td className="capitalize">{x.source}</td>
                        <td className={`text-right ${soon ? 'font-semibold text-amber-600' : ''}`}>{date(x.expiresAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-semibold"><Receipt className="size-5" /> {t('purchaseHistory')}</h2>
            {orders.isLoading ? (
              <ListSkeleton rows={2} />
            ) : orders.isError ? (
              <ErrorState error={orders.error} onRetry={orders.refetch} />
            ) : !orders.data.length ? (
              <EmptyState icon={Receipt} title="No purchases yet" text="Your invoices will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500">
                    <tr><th className="py-2">Date</th><th>Plan</th><th>Amount</th><th>Status</th><th className="text-right">{t('invoice')}</th></tr>
                  </thead>
                  <tbody>
                    {orders.data.map((o) => (
                      <tr key={o._id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-3">{date(o.paidAt || o.createdAt)}</td>
                        <td>{o.credits} credits</td>
                        <td>
                          {formatINR(o.amount, { decimals: 2 })}
                          <span className="block text-xs text-slate-400">incl. GST {formatINR(o.gstAmount, { decimals: 2 })}</span>
                        </td>
                        <td>
                          <StatusBadge status={o.status} />
                          {o.status === 'failed' && o.failureReason && <span className="block text-xs text-slate-400">{o.failureReason}</span>}
                        </td>
                        <td className="text-right">
                          {o.invoiceNo ? (
                            <button className="btn-ghost py-1 text-accent-600" onClick={() => downloadInvoice(o).catch(() => toast('Could not download invoice', 'error'))}>
                              <Download className="size-4" /> {o.invoiceNo}
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-20">
          <h2 className="mb-1 text-lg font-bold">{t('buyCredits', { defaultValue: 'Buy credits' })}</h2>
          <p className="mb-4 text-sm text-slate-500">{t('paywallSub')}</p>
          <PaywallContent />
        </aside>
      </div>
    </div>
  );
}
