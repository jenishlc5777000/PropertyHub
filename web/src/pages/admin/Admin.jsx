import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, Building2, Check, Coins, CreditCard, Search, Settings, ShieldAlert, Star, Tag, Users, X } from 'lucide-react';
import { apiErrorMessage, formatINR, formatPriceShort } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import BarChart from '../../components/BarChart';
import { EmptyState, ErrorState, Field, ListSkeleton, Modal, PageHeader, Seo, Spinner, StatusBadge } from '../../components/ui';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'listings', label: 'Listings', icon: Building2 },
  { id: 'users', label: 'Users & credits', icon: Users },
  { id: 'plans', label: 'Plans & settings', icon: Settings },
  { id: 'orders', label: 'Orders', icon: CreditCard },
  { id: 'promos', label: 'Promo codes', icon: Tag },
  { id: 'security', label: 'Security', icon: ShieldAlert },
];

function useAdminMutation(fn, keys, msg) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (msg) toast(msg, 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
}

function Pager({ meta, page, setPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <button className="btn-outline py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
      <span>{page} / {meta.pages}</span>
      <button className="btn-outline py-1.5" disabled={!meta.hasMore} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}

function Overview() {
  const [days, setDays] = useState(30);
  const stats = useQuery({ queryKey: ['adminStats'], queryFn: api.admin.stats });
  const rev = useQuery({ queryKey: ['adminRevenue', days], queryFn: () => api.admin.revenue({ days }) });
  if (stats.isLoading || rev.isLoading) return <ListSkeleton />;
  if (stats.isError) return <ErrorState error={stats.error} onRetry={stats.refetch} />;
  const s = stats.data;
  const tiles = [
    ['Total sales', formatINR(s.revenue)],
    ['Paid orders', s.paidOrders],
    ['GST collected', formatINR(s.gstCollected, { decimals: 2 })],
    ['Unlocks today', s.unlocksToday],
    ['Users', s.users],
    ['Agents', s.agents],
    ['Live listings', s.properties.approved || 0],
    ['Pending review', s.properties.pending || 0],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`chip border px-3 py-1.5 text-sm ${days === d ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
            Last {d} days
          </button>
        ))}
      </div>
      {rev.isError ? (
        <ErrorState error={rev.error} onRetry={rev.refetch} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChart data={rev.data.series} valueKey="amount" label="Sales (₹)" format={(v) => formatPriceShort(v)} />
            <BarChart data={rev.data.series} valueKey="unlocks" label="Contact unlocks" color="var(--color-brand-500)" />
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Top properties by unlocks</h3>
            {!rev.data.topProperties.length ? (
              <p className="text-sm text-slate-500">No unlocks yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Property</th><th>City</th><th className="text-right">Views</th><th className="text-right">Unlocks</th></tr></thead>
                <tbody>
                  {rev.data.topProperties.map((p) => (
                    <tr key={p._id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2"><Link to={`/property/${p.slug}`} className="hover:text-accent-600">{p.title}</Link></td>
                      <td>{p.address?.city}</td>
                      <td className="text-right tabular-nums">{p.views}</td>
                      <td className="text-right font-semibold tabular-nums">{p.unlockCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Listings() {
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const list = useQuery({ queryKey: ['adminProps', status, q, page], queryFn: () => api.admin.properties({ status: status || undefined, q: q || undefined, page }) });
  const keys = ['adminProps', 'adminStats'];
  const approve = useAdminMutation(api.admin.approve, keys, 'Listing approved');
  const reject = useAdminMutation(({ id, reason: r }) => api.admin.reject(id, r), keys, 'Listing rejected');
  const feature = useAdminMutation(({ id, featured }) => api.admin.feature(id, featured), keys);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected', 'sold', 'rented', ''].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`chip border px-3 py-1.5 text-sm capitalize ${status === s ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
            {s || 'All'}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="input w-56 py-1.5 pl-9" placeholder="Search title" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </div>
      {list.isLoading ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : !list.data.items.length ? (
        <EmptyState icon={Building2} title="Nothing to review" />
      ) : (
        <div className="space-y-3">
          {list.data.items.map((p) => (
            <div key={p._id} className="card flex flex-col gap-4 p-4 md:flex-row md:items-center">
              <img src={p.images[0]?.url} alt="" className="h-20 w-full rounded-lg object-cover md:w-28" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><StatusBadge status={p.status} />{p.featured && <Star className="size-4 fill-amber-400 text-amber-400" />}</div>
                <Link to={`/property/${p.slug}`} target="_blank" className="mt-1 block truncate font-semibold hover:text-accent-600">{p.title}</Link>
                <p className="text-sm text-slate-500">{formatPriceShort(p.price)} · {p.type} for {p.purpose} · {p.address.locality}, {p.address.city} · by {p.owner?.name}</p>
                <p className="text-xs text-slate-400">Contact: {p.contact.phone} · {p.contact.email} · {p.images.length} photos · posted {new Date(p.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.status !== 'approved' && <button className="btn-primary py-1.5" onClick={() => approve.mutate(p._id)}><Check className="size-4" /> Approve</button>}
                {p.status !== 'rejected' && <button className="btn-outline py-1.5 text-red-600" onClick={() => { setRejecting(p); setReason(''); }}><X className="size-4" /> Reject</button>}
                {p.status === 'approved' && (
                  <button className="btn-outline py-1.5" onClick={() => feature.mutate({ id: p._id, featured: !p.featured })}>
                    <Star className="size-4" /> {p.featured ? 'Unfeature' : 'Feature'}
                  </button>
                )}
              </div>
            </div>
          ))}
          <Pager meta={list.data.meta} page={page} setPage={setPage} />
        </div>
      )}
      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title="Reject listing">
        <p className="mb-3 text-sm text-slate-500">{rejecting?.title}</p>
        <Field label="Reason (sent to the owner)">
          <textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Photos are not of the actual property" />
        </Field>
        <button className="btn-danger mt-4 w-full" disabled={reject.isPending} onClick={() => reject.mutate({ id: rejecting._id, reason }, { onSuccess: () => setRejecting(null) })}>Reject</button>
      </Modal>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [grant, setGrant] = useState(null);
  const [g, setG] = useState({ amount: 10, kind: 'free', validityDays: 365, reason: '' });
  const list = useQuery({ queryKey: ['adminUsers', q, role, page], queryFn: () => api.admin.users({ q: q || undefined, role: role || undefined, page }) });
  const update = useAdminMutation(({ id, body }) => api.admin.updateUser(id, body), ['adminUsers'], 'User updated');
  const credits = useAdminMutation(({ id, body }) => api.admin.grantCredits(id, body), ['adminUsers'], 'Credits updated');

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Name, email or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-40" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option><option value="buyer">Buyers</option><option value="agent">Agents</option><option value="admin">Admins</option>
        </select>
      </div>
      {list.isLoading ? <ListSkeleton /> : list.isError ? <ErrorState error={list.error} onRetry={list.refetch} /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">User</th><th>Role</th><th>Credits</th><th>Status</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>
              {list.data.items.map((u) => (
                <tr key={u._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3"><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email} · {u.phone}</p></td>
                  <td>
                    <select className="rounded-lg border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700" value={u.role} onChange={(e) => update.mutate({ id: u._id, body: { role: e.target.value } })}>
                      <option value="buyer">buyer</option><option value="agent">agent</option><option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="tabular-nums">{u.credits.free} free + {u.credits.paid} paid</td>
                  <td>{u.isActive ? <span className="chip bg-accent-100 text-accent-700">Active</span> : <span className="chip bg-red-100 text-red-700">Disabled</span>}</td>
                  <td className="p-3 text-right">
                    <button className="btn-outline mr-2 py-1" onClick={() => { setGrant(u); setG({ amount: 10, kind: 'free', validityDays: 365, reason: '' }); }}><Coins className="size-4" /> Credits</button>
                    <button className={`btn py-1 ${u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-accent-600 hover:bg-accent-50'}`} onClick={() => update.mutate({ id: u._id, body: { isActive: !u.isActive } })}>
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 pb-3"><Pager meta={list.data.meta} page={page} setPage={setPage} /></div>
        </div>
      )}
      <Modal open={Boolean(grant)} onClose={() => setGrant(null)} title={`Adjust credits – ${grant?.name}`}>
        <p className="mb-4 text-sm text-slate-500">Current: {grant?.credits.free} free + {grant?.credits.paid} paid. Use a negative amount to revoke.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount"><input type="number" className="input" value={g.amount} onChange={(e) => setG({ ...g, amount: Number(e.target.value) })} /></Field>
          <Field label="Type">
            <select className="input" value={g.kind} onChange={(e) => setG({ ...g, kind: e.target.value })}><option value="free">Free (no expiry)</option><option value="paid">Paid (expires)</option></select>
          </Field>
          {g.kind === 'paid' && g.amount > 0 && <Field label="Validity (days)"><input type="number" className="input" value={g.validityDays} onChange={(e) => setG({ ...g, validityDays: Number(e.target.value) })} /></Field>}
          <div className="col-span-2"><Field label="Reason (audit log)"><input className="input" value={g.reason} onChange={(e) => setG({ ...g, reason: e.target.value })} /></Field></div>
        </div>
        <button
          className="btn-primary mt-4 w-full"
          disabled={credits.isPending || !g.amount}
          onClick={() => credits.mutate({ id: grant._id, body: { ...g, validityDays: g.kind === 'paid' ? g.validityDays : undefined } }, { onSuccess: () => setGrant(null) })}
        >
          {g.amount > 0 ? `Grant ${g.amount}` : `Revoke ${-g.amount}`} credits
        </button>
      </Modal>
    </div>
  );
}

function PlanEditor({ plan, onDone }) {
  const [f, setF] = useState(plan || { name: '', price: 999, credits: 100, validityDays: 365, active: true, benefits: [] });
  const save = useAdminMutation((body) => (plan ? api.admin.updatePlan(plan._id, body) : api.admin.createPlan(body)), ['adminPlans', 'plans'], 'Plan saved');
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ name: f.name, price: Number(f.price), credits: Number(f.credits), validityDays: Number(f.validityDays), active: f.active, benefits: f.benefits }, { onSuccess: onDone });
      }}
    >
      <div className="sm:col-span-2"><Field label="Name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field></div>
      <Field label="Price (₹, GST inclusive)"><input type="number" min="1" className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
      <Field label="Credits"><input type="number" min="1" className="input" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} /></Field>
      <Field label="Validity (days)"><input type="number" min="1" className="input" value={f.validityDays} onChange={(e) => setF({ ...f, validityDays: e.target.value })} /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
      <div className="sm:col-span-2"><Field label="Benefits (one per line)"><textarea className="input min-h-20" value={f.benefits.join('\n')} onChange={(e) => setF({ ...f, benefits: e.target.value.split('\n').filter(Boolean) })} /></Field></div>
      <p className="text-xs text-slate-500 sm:col-span-2">= {formatINR(Number(f.price) / Math.max(1, Number(f.credits)), { decimals: 2 })} per contact</p>
      <button className="btn-primary sm:col-span-2" disabled={save.isPending}>{save.isPending && <Spinner className="size-4" />} Save plan</button>
    </form>
  );
}

function Plans() {
  const plans = useQuery({ queryKey: ['adminPlans'], queryFn: api.admin.plans });
  const settings = useQuery({ queryKey: ['adminSettings'], queryFn: api.admin.settings });
  const [editing, setEditing] = useState(undefined);
  const [free, setFree] = useState('');
  const saveSettings = useAdminMutation(api.admin.updateSettings, ['adminSettings'], 'Settings saved');
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Credit plans</h3>
          <button className="btn-outline py-1.5" onClick={() => setEditing(null)}>New plan</button>
        </div>
        {plans.isLoading ? <ListSkeleton rows={1} /> : plans.isError ? <ErrorState error={plans.error} /> : (
          <ul className="space-y-2">
            {plans.data.map((p) => (
              <li key={p._id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div>
                  <p className="font-medium">{p.name} {!p.active && <span className="chip bg-slate-200 text-slate-600">inactive</span>}</p>
                  <p className="text-sm text-slate-500">{formatINR(p.price)} · {p.credits} credits · {p.validityDays} days</p>
                </div>
                <button className="btn-ghost py-1" onClick={() => setEditing(p)}>Edit</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="card p-5">
        <h3 className="mb-4 font-semibold">Free credits for new users</h3>
        {settings.data && (
          <form className="flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); saveSettings.mutate({ freeCredits: Number(free || settings.data.freeCredits) }); }}>
            <Field label="Credits granted once at sign-up (lifetime)">
              <input type="number" min="0" max="1000" className="input" placeholder={String(settings.data.freeCredits)} value={free} onChange={(e) => setFree(e.target.value)} />
            </Field>
            <button className="btn-primary" disabled={saveSettings.isPending}>Save</button>
          </form>
        )}
        <p className="mt-3 text-xs text-slate-500">Applies to accounts created after the change. Existing balances are not affected.</p>
      </div>
      <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit plan' : 'New plan'}>
        {editing !== undefined && <PlanEditor plan={editing} onDone={() => setEditing(undefined)} />}
      </Modal>
    </div>
  );
}

function Orders() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [refunding, setRefunding] = useState(null);
  const list = useQuery({ queryKey: ['adminOrders', status, page], queryFn: () => api.admin.orders({ status: status || undefined, page }) });
  const refund = useAdminMutation(api.admin.refund, ['adminOrders', 'adminStats'], 'Refund issued');
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {['', 'paid', 'created', 'failed', 'refunded'].map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`chip border px-3 py-1.5 text-sm capitalize ${status === s ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-300 dark:border-slate-700'}`}>{s || 'All'}</button>
        ))}
      </div>
      {list.isLoading ? <ListSkeleton /> : list.isError ? <ErrorState error={list.error} onRetry={list.refetch} /> : !list.data.items.length ? <EmptyState icon={CreditCard} title="No orders" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th>User</th><th>Amount</th><th>Credits</th><th>Status</th><th>Invoice / Payment</th><th className="p-3" /></tr></thead>
            <tbody>
              {list.data.items.map((o) => (
                <tr key={o._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3">{new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><p>{o.user?.name}</p><p className="text-xs text-slate-500">{o.user?.email}</p></td>
                  <td className="tabular-nums">{formatINR(o.amount, { decimals: 2 })}{o.promoCode && <span className="block text-xs text-slate-500">{o.promoCode}</span>}</td>
                  <td>{o.credits}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-xs"><p>{o.invoiceNo || '—'}</p><p className="text-slate-500">{o.paymentId || o.razorpayOrderId}</p></td>
                  <td className="p-3 text-right">{o.status === 'paid' && <button className="btn-outline py-1 text-red-600" onClick={() => setRefunding(o)}>Refund</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 pb-3"><Pager meta={list.data.meta} page={page} setPage={setPage} /></div>
        </div>
      )}
      <Modal open={Boolean(refunding)} onClose={() => setRefunding(null)} title="Refund order?">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {formatINR(refunding?.amount, { decimals: 2 })} will be refunded to {refunding?.user?.name} via Razorpay and any unused credits from this order will be removed. This cannot be undone.
        </p>
        <button className="btn-danger mt-5 w-full" disabled={refund.isPending} onClick={() => refund.mutate(refunding._id, { onSuccess: () => setRefunding(null) })}>
          {refund.isPending && <Spinner className="size-4" />} Confirm refund
        </button>
      </Modal>
    </div>
  );
}

function Promos() {
  const list = useQuery({ queryKey: ['adminPromos'], queryFn: api.admin.promos });
  const [f, setF] = useState({ code: '', discountPct: 10, maxUses: 100, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) });
  const create = useAdminMutation(api.admin.createPromo, ['adminPromos'], 'Promo created');
  const toggle = useAdminMutation(({ id, active }) => api.admin.updatePromo(id, { active }), ['adminPromos']);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card overflow-x-auto">
        {list.isLoading ? <div className="p-4"><ListSkeleton rows={2} /></div> : list.isError ? <ErrorState error={list.error} /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Code</th><th>Discount</th><th>Used</th><th>Expires</th><th className="p-3" /></tr></thead>
            <tbody>
              {list.data.map((p) => (
                <tr key={p._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-3 font-mono font-semibold">{p.code}</td>
                  <td>{p.discountPct}%</td>
                  <td>{p.used} / {p.maxUses}</td>
                  <td>{new Date(p.expiresAt).toLocaleDateString('en-IN')}</td>
                  <td className="p-3 text-right"><button className="btn-ghost py-1" onClick={() => toggle.mutate({ id: p._id, active: !p.active })}>{p.active ? 'Disable' : 'Enable'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ ...f, discountPct: Number(f.discountPct), maxUses: Number(f.maxUses) });
        }}
      >
        <h3 className="font-semibold">New promo code</h3>
        <Field label="Code"><input className="input uppercase" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} required minLength={3} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount %"><input type="number" min="1" max="90" className="input" value={f.discountPct} onChange={(e) => setF({ ...f, discountPct: e.target.value })} /></Field>
          <Field label="Max uses"><input type="number" min="1" className="input" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} /></Field>
        </div>
        <Field label="Expires on"><input type="date" className="input" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={create.isPending}>Create</button>
      </form>
    </div>
  );
}

function Security() {
  const q = useQuery({ queryKey: ['adminSuspicious'], queryFn: api.admin.suspicious });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!q.data.length) return <EmptyState icon={ShieldAlert} title="No suspicious activity" text="Bulk unlocking, bad payment signatures and amount mismatches are logged here." />;
  return (
    <div className="space-y-2">
      {q.data.map((a) => (
        <div key={a._id} className={`card flex items-start gap-3 p-4 ${a.severity === 'critical' ? 'border-red-300 dark:border-red-500/40' : ''}`}>
          <AlertTriangle className={`mt-0.5 size-5 shrink-0 ${a.severity === 'critical' ? 'text-red-600' : 'text-amber-500'}`} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold">{a.action.replace(/_/g, ' ')} <span className="font-normal uppercase text-slate-500">({a.severity})</span></p>
            <p className="text-slate-500">{a.user ? `${a.user.name} <${a.user.email}>` : 'System'} · {new Date(a.createdAt).toLocaleString('en-IN')} {a.ip && `· IP ${a.ip}`}</p>
            <pre className="mt-1 overflow-x-auto text-xs text-slate-500">{JSON.stringify(a.meta)}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('overview');
  const Tab = { overview: Overview, listings: Listings, users: UsersTab, plans: Plans, orders: Orders, promos: Promos, security: Security }[tab];
  return (
    <div className="container-x py-8">
      <Seo title="Admin" noindex />
      <PageHeader title="Admin dashboard" />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${tab === id ? 'border-accent-600 text-accent-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      <Tab />
    </div>
  );
}
