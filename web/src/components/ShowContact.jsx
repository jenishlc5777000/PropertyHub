import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Coins, Lock, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { apiErrorCode, apiErrorMessage, whatsappLink, formatINR } from '@propertyhub/shared';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useBalance } from '../hooks/useData';
import { usePurchase } from '../hooks/usePurchase';
import { Modal, Spinner } from './ui';

export function ContactDetails({ contact, title }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {contact.name && <p className="text-sm text-slate-500">{contact.name}</p>}
      <div className="grid gap-2 sm:grid-cols-3">
        <a href={`tel:${contact.phone}`} className="btn-dark">
          <Phone className="size-4" /> {t('call')}
        </a>
        <a href={whatsappLink(contact.whatsapp, `Hi, I'm interested in "${title}" on PropertyHub`)} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95">
          <MessageCircle className="size-4" /> {t('whatsapp')}
        </a>
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="btn-outline">
            <Mail className="size-4" /> {t('email')}
          </a>
        )}
      </div>
      <dl className="grid gap-1 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
        <div className="flex justify-between"><dt className="text-slate-500">{t('phone')}</dt><dd className="font-semibold">{contact.phone}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">{t('whatsapp')}</dt><dd className="font-semibold">{contact.whatsapp}</dd></div>
        {contact.email && <div className="flex justify-between gap-2"><dt className="text-slate-500">{t('email')}</dt><dd className="truncate font-semibold">{contact.email}</dd></div>}
      </dl>
    </div>
  );
}

export function PaywallContent({ onDone }) {
  const { t } = useTranslation();
  const plans = useQuery({ queryKey: ['plans'], queryFn: api.payments.plans });
  const purchase = usePurchase();
  const [promo, setPromo] = useState('');
  const plan = plans.data?.[0];

  if (plans.isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!plan) return <p className="text-sm text-slate-500">No plans available right now.</p>;

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-700 p-5 text-white">
        <p className="text-sm text-brand-200">{plan.name}</p>
        <p className="mt-1 text-3xl font-extrabold">{formatINR(plan.price)}</p>
        <p className="mt-1 text-sm text-brand-100">
          {plan.credits} credits · {formatINR(plan.price / plan.credits, { decimals: 2 })} per contact · {Math.round(plan.validityDays / 30)} months validity
        </p>
        <p className="mt-1 text-xs text-brand-200">Inclusive of 18% GST</p>
      </div>
      <ul className="my-5 space-y-2.5 text-sm">
        {[t('paywallBenefit1'), t('paywallBenefit2'), t('paywallBenefit3')].map((b) => (
          <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent-600" /> {b}</li>
        ))}
      </ul>
      <input className="input mb-3" placeholder="Promo code (optional)" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} maxLength={30} />
      <button
        className="btn-primary w-full py-3 text-base"
        disabled={purchase.busy}
        onClick={async () => {
          const r = await purchase.buy(plan._id, promo);
          if (r.status === 'success' || r.status === 'pending') onDone?.(r.status);
        }}
      >
        {purchase.busy ? <Spinner /> : <Lock className="size-4" />}
        {purchase.status === 'verifying' ? 'Confirming payment…' : t('payNow', { amount: plan.price })}
      </button>
      {purchase.status === 'failed' && purchase.error && <p className="mt-2 text-center text-sm text-red-600">{purchase.error}</p>}
      {purchase.status === 'cancelled' && <p className="mt-2 text-center text-sm text-slate-500">Payment cancelled. You were not charged.</p>}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="size-3.5" /> Secured by Razorpay · UPI, cards, netbanking, wallets
      </p>
    </div>
  );
}

/**
 * "Show contact" button with the full flow: login prompt, confirm modal, paywall, reveal.
 * Contact details only ever come from the server, which masks them until unlocked.
 */
export default function ShowContactButton({ property, compact }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: balance } = useBalance();
  const [modal, setModal] = useState(null); // confirm | paywall | revealed
  const [contact, setContact] = useState(property.contactUnlocked && !property.contact?.masked ? property.contact : null);

  const unlock = useMutation({
    mutationFn: () => api.properties.unlockContact(property._id),
    onSuccess: (data) => {
      setContact(data.contact);
      qc.setQueryData(['balance'], data.balance);
      qc.invalidateQueries({ queryKey: ['property', property.slug] });
      qc.invalidateQueries({ queryKey: ['unlocked'] });
      setModal('revealed');
    },
    onError: (e) => {
      if (apiErrorCode(e) === 'NO_CREDITS') setModal('paywall');
      else {
        setModal(null);
        toast(apiErrorMessage(e), 'error');
      }
    },
  });

  if (property.isOwner) {
    return <p className="rounded-xl bg-slate-100 px-3 py-2 text-center text-sm text-slate-500 dark:bg-slate-800">{t('ownContact')}</p>;
  }

  const onClick = () => {
    if (!user) return nav('/login', { state: { from: `/property/${property.slug}`, reason: 'login_required' } });
    if (contact || property.contactUnlocked) {
      if (contact) return setModal('revealed');
      return unlock.mutate(); // already unlocked server-side: free re-open
    }
    if (balance && balance.total <= 0) return setModal('paywall');
    setModal('confirm');
  };

  const masked = property.contact;
  return (
    <>
      <button onClick={onClick} className={`btn-primary w-full ${compact ? 'py-2' : 'py-3'}`} disabled={unlock.isPending}>
        {unlock.isPending ? <Spinner className="size-4" /> : <Phone className="size-4" />}
        {contact || property.contactUnlocked ? t('contactDetails') : t('showContact')}
        {!compact && !contact && masked?.phone && <span className="font-mono text-xs opacity-80">{masked.phone}</span>}
      </button>

      <Modal open={modal === 'confirm'} onClose={() => setModal(null)} title={t('useCreditTitle')}>
        <div className="flex items-center gap-3 rounded-xl bg-accent-50 p-4 text-accent-700 dark:bg-accent-600/10">
          <Coins className="size-6" />
          <p className="text-sm font-medium">{t('useCreditText', { count: balance?.total ?? 0 })}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t('creditsLeft', { free: balance?.free ?? 0, paid: balance?.paid ?? 0 })}. {t('paywallBenefit2')}.</p>
        <div className="mt-5 flex gap-3">
          <button className="btn-outline flex-1" onClick={() => setModal(null)}>{t('cancel')}</button>
          <button className="btn-primary flex-1" onClick={() => unlock.mutate()} disabled={unlock.isPending}>
            {unlock.isPending && <Spinner className="size-4" />} {t('confirm')}
          </button>
        </div>
      </Modal>

      <Modal open={modal === 'paywall'} onClose={() => setModal(null)} title={t('noCreditsTitle')}>
        <p className="mb-4 text-sm text-slate-500">{t('paywallTitle')}. {t('paywallSub')}</p>
        <PaywallContent onDone={(s) => (s === 'success' ? setModal('confirm') : setModal(null))} />
      </Modal>

      <Modal open={modal === 'revealed' && Boolean(contact)} onClose={() => setModal(null)} title={t('contactDetails')}>
        {contact && <ContactDetails contact={contact} title={property.title} />}
        {balance && <p className="mt-4 text-center text-xs text-slate-500">{t('creditsLeft', { free: balance.free, paid: balance.paid })}</p>}
      </Modal>
    </>
  );
}
