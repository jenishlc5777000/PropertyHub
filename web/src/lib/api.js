import axios from 'axios';
import { createApiClient } from '@propertyhub/shared';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

const ACCESS = 'ph_access';
const REFRESH = 'ph_refresh';

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const tokenStore = {
  getAccess: () => safe(() => localStorage.getItem(ACCESS)),
  getRefresh: () => safe(() => localStorage.getItem(REFRESH)),
  set: (access, refresh) =>
    safe(() => {
      localStorage.setItem(ACCESS, access);
      if (refresh) localStorage.setItem(REFRESH, refresh);
    }),
  clear: () =>
    safe(() => {
      localStorage.removeItem(ACCESS);
      localStorage.removeItem(REFRESH);
    }),
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

/** Downloads an authenticated file (e.g. invoice PDF). */
export async function downloadInvoice(order) {
  const res = await api.payments.invoiceBlob(order._id);
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(order.invoiceNo || 'invoice').replace(/\//g, '-')}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
