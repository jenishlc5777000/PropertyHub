import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, CITIES, LOCALITIES } from '@propertyhub/shared';
import { api } from './api';
import { useAuth } from './context/AuthContext';
import { openCheckout } from './lib/razorpay';

const FALLBACK_CONFIG = { activeCities: CITIES.map((c) => ({ ...c, localities: LOCALITIES[c.name] || [] })), freeCredits: 7 };

/** Live cities (with localities) from the server. Admins control this list. */
export function useConfig() {
  const q = useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: 5 * 60_000, placeholderData: FALLBACK_CONFIG });
  const config = q.data || FALLBACK_CONFIG;
  return {
    ...config,
    cities: config.activeCities,
    singleCity: config.activeCities.length === 1 ? config.activeCities[0] : null,
    localitiesOf: (city) => config.activeCities.find((c) => c.name === city)?.localities || [],
  };
}

export function useBalance() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['balance'], queryFn: api.credits.balance, enabled: Boolean(user), staleTime: 30_000 });
}

export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favIds'],
    queryFn: api.favorites.ids,
    enabled: Boolean(user),
    select: (ids) => new Set(ids),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, on }) => (on ? api.favorites.add(id) : api.favorites.remove(id)),
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: ['favIds'] });
      const prev = qc.getQueryData(['favIds']);
      qc.setQueryData(['favIds'], (old = []) => (on ? [...new Set([...old, id])] : old.filter((x) => x !== id)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(['favIds'], ctx?.prev);
      Alert.alert('Error', apiErrorMessage(e));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['favIds'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

/** create order -> Razorpay -> verify. status: idle|creating|checkout|verifying|success|failed|pending|cancelled */
export function usePurchase() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['balance'] });
    qc.invalidateQueries({ queryKey: ['orders'] });
  };

  async function buy(planId, promoCode) {
    setError(null);
    setStatus('creating');
    let order;
    try {
      order = await api.payments.createOrder({ planId, promoCode: promoCode || undefined });
    } catch (e) {
      setStatus('failed');
      setError(apiErrorMessage(e));
      return 'failed';
    }
    setStatus('checkout');
    const r = await openCheckout(order);
    if (r.status === 'dismissed') {
      setStatus('cancelled');
      api.payments.markFailed(order.orderId, 'Checkout closed by user').catch(() => {});
      return 'cancelled';
    }
    if (r.status === 'failed') {
      setStatus('failed');
      setError(r.error?.description || t('paymentFailed'));
      api.payments.markFailed(order.orderId, r.error?.description).catch(() => {});
      return 'failed';
    }
    setStatus('verifying');
    try {
      const v = await api.payments.verify(r.response);
      qc.setQueryData(['balance'], v.balance);
      refresh();
      setStatus('success');
      return 'success';
    } catch (e) {
      if (!e.response || e.response.status >= 500) {
        // Captured but unconfirmed: the webhook will credit the wallet.
        setStatus('pending');
        [5000, 15000, 30000].forEach((ms) => setTimeout(refresh, ms));
        return 'pending';
      }
      setStatus('failed');
      setError(apiErrorMessage(e));
      return 'failed';
    }
  }
  return { buy, status, error, busy: ['creating', 'checkout', 'verifying'].includes(status) };
}
