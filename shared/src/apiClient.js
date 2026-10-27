/**
 * Shared API client used by web and mobile.
 * Pass in axios plus token storage callbacks so each platform can store tokens its own way
 * (localStorage on web, expo-secure-store on mobile).
 */
export function createApiClient({ axios, baseURL, tokenStore, onLogout }) {
  const http = axios.create({ baseURL, timeout: 20000 });

  http.interceptors.request.use(async (config) => {
    const token = await tokenStore.getAccess();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  let refreshing = null;
  http.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      const status = error.response?.status;
      const isAuthCall = original?.url?.includes('/auth/');
      if (status === 401 && !original._retry && !isAuthCall) {
        original._retry = true;
        try {
          refreshing =
            refreshing ||
            (async () => {
              const refreshToken = await tokenStore.getRefresh();
              if (!refreshToken) throw new Error('No refresh token');
              const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
              await tokenStore.set(data.data.accessToken, data.data.refreshToken);
              return data.data.accessToken;
            })();
          const token = await refreshing;
          refreshing = null;
          original.headers.Authorization = `Bearer ${token}`;
          return http(original);
        } catch (e) {
          refreshing = null;
          await tokenStore.clear();
          onLogout?.();
          return Promise.reject(e);
        }
      }
      return Promise.reject(error);
    }
  );

  const d = (p) => p.then((r) => r.data.data);
  const withMeta = (p) => p.then((r) => ({ items: r.data.data, meta: r.data.meta }));

  return {
    http,
    auth: {
      register: (body) => d(http.post('/auth/register', body)),
      login: (body) => d(http.post('/auth/login', body)),
      logout: (refreshToken) => d(http.post('/auth/logout', { refreshToken })),
      forgotPassword: (body) => d(http.post('/auth/forgot-password', body)),
      resetPassword: (body) => d(http.post('/auth/reset-password', body)),
    },
    users: {
      me: () => d(http.get('/users/me')),
      update: (body) => d(http.patch('/users/me', body)),
      changePassword: (body) => d(http.post('/users/me/password', body)),
      uploadAvatar: (formData) =>
        d(http.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
      registerPushToken: (token) => d(http.post('/users/me/push-token', { token })),
      agent: (id) => d(http.get(`/users/agents/${id}`)),
    },
    properties: {
      list: (params) => withMeta(http.get('/properties', { params })),
      near: (params) => d(http.get('/properties/near', { params })),
      featured: () => d(http.get('/properties/featured')),
      get: (idOrSlug) => d(http.get(`/properties/${idOrSlug}`)),
      similar: (id) => d(http.get(`/properties/${id}/similar`)),
      mine: (params) => withMeta(http.get('/properties/mine', { params })),
      create: (formData) =>
        d(http.post('/properties', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
      update: (id, formData) =>
        d(http.patch(`/properties/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
      remove: (id) => d(http.delete(`/properties/${id}`)),
      setStatus: (id, status) => d(http.patch(`/properties/${id}/status`, { status })),
      unlockContact: (id) => d(http.post(`/properties/${id}/unlock-contact`)),
    },
    favorites: {
      list: () => d(http.get('/favorites')),
      ids: () => d(http.get('/favorites/ids')),
      add: (propertyId) => d(http.post(`/favorites/${propertyId}`)),
      remove: (propertyId) => d(http.delete(`/favorites/${propertyId}`)),
    },
    inquiries: {
      list: (params) => d(http.get('/inquiries', { params })),
      get: (id) => d(http.get(`/inquiries/${id}`)),
      create: (body) => d(http.post('/inquiries', body)),
      reply: (id, text) => d(http.post(`/inquiries/${id}/messages`, { text })),
    },
    visits: {
      list: (params) => d(http.get('/visits', { params })),
      create: (body) => d(http.post('/visits', body)),
      setStatus: (id, status) => d(http.patch(`/visits/${id}`, { status })),
    },
    notifications: {
      list: () => d(http.get('/notifications')),
      read: (id) => d(http.patch(`/notifications/${id}/read`)),
      readAll: () => d(http.patch('/notifications/read-all')),
    },
    credits: {
      balance: () => d(http.get('/credits/balance')),
      unlocked: (params) => withMeta(http.get('/unlocked-contacts', { params })),
    },
    payments: {
      plans: () => d(http.get('/plans')),
      createOrder: (body) => d(http.post('/payments/create-order', body)),
      verify: (body) => d(http.post('/payments/verify', body)),
      markFailed: (orderId, reason) => d(http.post('/payments/failed', { orderId, reason })),
      orders: () => d(http.get('/payments/orders')),
      invoiceUrl: (id) => `${baseURL}/payments/orders/${id}/invoice`,
      invoiceBlob: (id) => http.get(`/payments/orders/${id}/invoice`, { responseType: 'blob' }),
    },
    agent: {
      stats: () => d(http.get('/users/me/stats')),
    },
    admin: {
      stats: () => d(http.get('/admin/stats')),
      revenue: (params) => d(http.get('/admin/revenue', { params })),
      properties: (params) => withMeta(http.get('/admin/properties', { params })),
      approve: (id) => d(http.patch(`/admin/properties/${id}/approve`)),
      reject: (id, reason) => d(http.patch(`/admin/properties/${id}/reject`, { reason })),
      feature: (id, featured) => d(http.patch(`/admin/properties/${id}/feature`, { featured })),
      users: (params) => withMeta(http.get('/admin/users', { params })),
      updateUser: (id, body) => d(http.patch(`/admin/users/${id}`, body)),
      grantCredits: (id, body) => d(http.post(`/admin/users/${id}/credits`, body)),
      plans: () => d(http.get('/admin/plans')),
      createPlan: (body) => d(http.post('/admin/plans', body)),
      updatePlan: (id, body) => d(http.patch(`/admin/plans/${id}`, body)),
      settings: () => d(http.get('/admin/settings')),
      updateSettings: (body) => d(http.patch('/admin/settings', body)),
      orders: (params) => withMeta(http.get('/admin/orders', { params })),
      refund: (id) => d(http.post(`/admin/orders/${id}/refund`)),
      promos: () => d(http.get('/admin/promos')),
      createPromo: (body) => d(http.post('/admin/promos', body)),
      updatePromo: (id, body) => d(http.patch(`/admin/promos/${id}`, body)),
      suspicious: () => d(http.get('/admin/audit/suspicious')),
    },
  };
}

/** Extract a human-readable message from an axios error. */
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.error?.message || err?.message || fallback;
}

export function apiErrorCode(err) {
  return err?.response?.data?.error?.code;
}
