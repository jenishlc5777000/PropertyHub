import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore, onForcedLogout } from '../api';
import { registerForPush } from '../lib/push';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (await tokenStore.getRefresh()) {
          const me = await api.users.me();
          setUser(me);
          registerForPush();
        }
      } catch {
        await tokenStore.clear();
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(
    () =>
      onForcedLogout(() => {
        setUser(null);
        qc.clear();
      }),
    [qc]
  );

  const signIn = useCallback(
    async ({ user: u, accessToken, refreshToken }) => {
      await tokenStore.set(accessToken, refreshToken);
      setUser(u);
      qc.invalidateQueries();
      registerForPush();
    },
    [qc]
  );

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout(await tokenStore.getRefresh());
    } catch {
      /* ignore */
    }
    await tokenStore.clear();
    setUser(null);
    qc.clear();
  }, [qc]);

  const value = useMemo(() => ({ user, ready, setUser, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
