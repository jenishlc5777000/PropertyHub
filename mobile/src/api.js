import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { createApiClient } from '@propertyhub/shared';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api/v1';
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://propertyhub.in';

const ACCESS = 'ph_access';
const REFRESH = 'ph_refresh';

// Tokens live in the device keychain/keystore, never in AsyncStorage.
export const tokenStore = {
  getAccess: () => SecureStore.getItemAsync(ACCESS),
  getRefresh: () => SecureStore.getItemAsync(REFRESH),
  set: async (access, refresh) => {
    await SecureStore.setItemAsync(ACCESS, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH, refresh);
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
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
