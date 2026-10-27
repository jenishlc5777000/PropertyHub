import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, MessageSquare, Send } from 'lucide-react';
import { apiErrorMessage } from '@propertyhub/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Seo, Spinner } from '../../components/ui';

const fmt = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function Thread({ id, onBack }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const end = useRef(null);
  const q = useQuery({ queryKey: ['inquiry', id], queryFn: () => api.inquiries.get(id), refetchInterval: 15000 });
  const send = useMutation({
    mutationFn: () => api.inquiries.reply(id, text.trim()),
    onSuccess: (data) => {
      qc.setQueryData(['inquiry', id], data);
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      setText('');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [q.data?.messages?.length]);

  if (q.isLoading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const inq = q.data;
  const other = inq.role === 'buyer' ? inq.agent : inq.buyer;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <button className="btn-ghost p-1.5 md:hidden" onClick={onBack} aria-label={t('back')}><ArrowLeft className="size-5" /></button>
        {inq.property?.image && <img src={inq.property.image} alt="" className="size-10 rounded-lg object-cover" />}
        <div className="min-w-0">
          <p className="truncate font-semibold">{other?.name}</p>
          {inq.property && <Link to={`/property/${inq.property.slug}`} className="block truncate text-xs text-accent-600 hover:underline">{inq.property.title}</Link>}
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {inq.messages.map((m) => {
          const mine = String(m.sender) === String(user._id);
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? 'rounded-br-sm bg-accent-600 text-white' : 'rounded-bl-sm bg-slate-100 dark:bg-slate-800'}`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-accent-100' : 'text-slate-400'}`}>{fmt(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate();
        }}
      >
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('typeMessage')} maxLength={1000} />
        <button className="btn-primary px-3" disabled={send.isPending || !text.trim()} aria-label={t('send')}>
          {send.isPending ? <Spinner className="size-4" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

function Visits() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['visits'], queryFn: () => api.visits.list() });
  const m = useMutation({
    mutationFn: ({ id, status }) => api.visits.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visits'] }),
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!q.data.length) return <EmptyState icon={Calendar} title="No visits scheduled" text="Request a visit from any property page." />;
  const color = { requested: 'bg-amber-100 text-amber-800', confirmed: 'bg-accent-100 text-accent-700', cancelled: 'bg-red-100 text-red-700', done: 'bg-slate-200 text-slate-700' };
  return (
    <div className="space-y-3">
      {q.data.map((v) => {
        const isAgent = String(v.agent._id) === String(user._id);
        return (
          <div key={v._id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-900 text-center text-white">
              <div>
                <p className="text-lg font-bold leading-none">{new Date(v.date).getDate()}</p>
                <p className="text-[10px] uppercase">{new Date(v.date).toLocaleString('en-IN', { month: 'short' })}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/property/${v.property?.slug}`} className="font-semibold hover:text-accent-600">{v.property?.title || 'Deleted property'}</Link>
              <p className="text-sm text-slate-500">
                {t(v.slot)} · {isAgent ? `Buyer: ${v.buyer.name}` : `Owner: ${v.agent.name}`}
              </p>
              {v.note && <p className="text-sm text-slate-500">"{v.note}"</p>}
            </div>
            <span className={`chip capitalize ${color[v.status]}`}>{v.status}</span>
            <div className="flex gap-2">
              {isAgent && v.status === 'requested' && <button className="btn-primary py-1.5" onClick={() => m.mutate({ id: v._id, status: 'confirmed' })}>Confirm</button>}
              {isAgent && v.status === 'confirmed' && <button className="btn-outline py-1.5" onClick={() => m.mutate({ id: v._id, status: 'done' })}>Mark done</button>}
              {['requested', 'confirmed'].includes(v.status) && <button className="btn-ghost py-1.5 text-red-600" onClick={() => m.mutate({ id: v._id, status: 'cancelled' })}>{t('cancel')}</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Inquiries() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('messages');
  const selected = params.get('id');
  const q = useQuery({ queryKey: ['inquiries'], queryFn: () => api.inquiries.list(), refetchInterval: 30000 });

  return (
    <div className="container-x py-8">
      <Seo title={t('inquiries')} noindex />
      <PageHeader title={t('inquiries')} />
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('messages')} className={`btn ${tab === 'messages' ? 'bg-brand-900 text-white' : 'btn-outline'}`}><MessageSquare className="size-4" /> Messages</button>
        <button onClick={() => setTab('visits')} className={`btn ${tab === 'visits' ? 'bg-brand-900 text-white' : 'btn-outline'}`}><Calendar className="size-4" /> Visits</button>
      </div>
      {tab === 'visits' ? (
        <Visits />
      ) : q.isLoading ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : !q.data.length ? (
        <EmptyState icon={MessageSquare} title="No conversations yet" text="Send an inquiry from a property page and replies will appear here." action={<Link to="/properties" className="btn-primary">{t('listings')}</Link>} />
      ) : (
        <div className="card grid h-[70vh] overflow-hidden md:grid-cols-[320px_1fr]">
          <ul className={`overflow-y-auto border-r border-slate-200 dark:border-slate-800 ${selected ? 'hidden md:block' : ''}`}>
            {q.data.map((inq) => {
              const other = inq.role === 'buyer' ? inq.agent : inq.buyer;
              return (
                <li key={inq._id}>
                  <button
                    onClick={() => setParams({ id: inq._id })}
                    className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${selected === inq._id ? 'bg-accent-50 dark:bg-accent-600/10' : ''}`}
                  >
                    {inq.property?.image ? <img src={inq.property.image} alt="" className="size-12 shrink-0 rounded-lg object-cover" /> : <div className="size-12 shrink-0 rounded-lg bg-slate-200" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${inq.unread ? 'font-bold' : 'font-medium'}`}>{other?.name}</p>
                        <span className={`chip shrink-0 text-[10px] ${inq.role === 'agent' ? 'bg-accent-100 text-accent-700' : 'bg-slate-100 text-slate-600'}`}>{inq.role === 'agent' ? 'Lead' : 'Sent'}</span>
                      </div>
                      <p className="truncate text-xs text-slate-500">{inq.property?.title}</p>
                      <p className={`truncate text-xs ${inq.unread ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400'}`}>{inq.lastMessage?.text}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={`${selected ? '' : 'hidden md:flex'} min-h-0 md:flex md:flex-col`}>
            {selected ? (
              <Thread key={selected} id={selected} onBack={() => setParams({})} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Select a conversation</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
