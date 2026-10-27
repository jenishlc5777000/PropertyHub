import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore, onForcedLogout } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!tokenStore.getAccess() && !tokenStore.getRefresh()) {
      setReady(true);
      return;
    }
    api.users
      .me()
      .then((u) => alive && setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
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
    ({ user: u, accessToken, refreshToken }) => {
      tokenStore.set(accessToken, refreshToken);
      setUser(u);
      qc.invalidateQueries();
    },
    [qc]
  );

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout(tokenStore.getRefresh());
    } catch {
      /* ignore network errors on logout */
    }
    tokenStore.clear();
    setUser(null);
    qc.clear();
  }, [qc]);

  const value = useMemo(() => ({ user, ready, setUser, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
