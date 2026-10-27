import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, CITIES, LOCALITIES } from '@propertyhub/shared';

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
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useBalance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['balance'],
    queryFn: api.credits.balance,
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

export function useFavoriteIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favIds'],
    queryFn: api.favorites.ids,
    enabled: Boolean(user),
    select: (ids) => new Set(ids),
    staleTime: 60_000,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, on }) => (on ? api.favorites.add(id) : api.favorites.remove(id)),
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: ['favIds'] });
      const prev = qc.getQueryData(['favIds']);
      qc.setQueryData(['favIds'], (old = []) => (on ? [...new Set([...old, id])] : old.filter((x) => x !== id)));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(['favIds'], ctx?.prev);
      toast(apiErrorMessage(err), 'error');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['favIds'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications.list,
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
}
