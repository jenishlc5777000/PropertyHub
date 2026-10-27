import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createApiClient } from '@propertyhub/shared';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api/v1';
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://propertyhub.in';

const ACCESS = 'ph_access';
const REFRESH = 'ph_refresh';

// Tokens live in the device keychain/keystore (expo-secure-store), never in AsyncStorage.
// SecureStore has no web implementation, so the web preview (`expo start --web`) uses localStorage.
const store =
  Platform.OS === 'web'
    ? {
        get: async (k) => globalThis.localStorage?.getItem(k) ?? null,
        set: async (k, v) => globalThis.localStorage?.setItem(k, v),
        del: async (k) => globalThis.localStorage?.removeItem(k),
      }
    : { get: SecureStore.getItemAsync, set: SecureStore.setItemAsync, del: SecureStore.deleteItemAsync };

export const tokenStore = {
  getAccess: () => store.get(ACCESS),
  getRefresh: () => store.get(REFRESH),
  set: async (access, refresh) => {
    await store.set(ACCESS, access);
    if (refresh) await store.set(REFRESH, refresh);
  },
  clear: async () => {
    await store.del(ACCESS);
    await store.del(REFRESH);
  },
};

const listeners = new Set();
export const onForcedLogout = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const api = createApiClient({
  axios,
  baseURL: API_URL,
  tokenStore,
  onLogout: () => listeners.forEach((fn) => fn()),
});
