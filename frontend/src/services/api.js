import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const isDev = process.env.NODE_ENV === 'development';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// ── Request logger ────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('at_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (isDev) {
    const url = `${config.baseURL || ''}${config.url}`;
    console.groupCollapsed(`%c[API] ➜ ${config.method?.toUpperCase()} ${config.url}`, 'color:#2563eb;font-weight:bold');
    console.log('Full URL:', url);
    if (config.params && Object.keys(config.params).length) console.log('Params:', config.params);
    if (config.data) console.log('Body:', config.data);
    console.groupEnd();
  }

  return config;
});

// ── Response logger ───────────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => {
    if (isDev) {
      const { method, url } = res.config;
      console.groupCollapsed(`%c[API] ✓ ${res.status} ${method?.toUpperCase()} ${url}`, 'color:#16a34a;font-weight:bold');
      console.log('Response:', res.data);
      console.groupEnd();
    }
    return res;
  },
  (err) => {
    if (isDev) {
      const config = err.config || {};
      const status = err.response?.status;
      const method = config.method?.toUpperCase() || '?';
      const url = config.url || '?';
      const responseBody = err.response?.data;

      console.group(`%c[API] ✗ ${status ?? 'NETWORK'} ${method} ${url}`, 'color:#dc2626;font-weight:bold');
      console.log('Full URL:', `${config.baseURL || ''}${url}`);
      if (config.params && Object.keys(config.params).length) console.log('Params:', config.params);
      if (config.data) console.log('Sent body:', config.data);
      console.log('Status:', status ?? 'No response (network error or CORS)');
      if (responseBody) console.log('Server response:', responseBody);
      if (!err.response) console.log('Raw error:', err.message);
      console.trace('Call stack');
      console.groupEnd();
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('at_token');
      localStorage.removeItem('at_admin');
      window.location.href = '/login';
    }

    // Normalise: attach a human-readable message to the error so callers
    // don't need to dig into err.response.data.message themselves.
    const serverMsg = err.response?.data?.message;
    const networkMsg = !err.response ? `Network error — is the backend running at ${API_BASE}?` : null;
    err.displayMessage = serverMsg || networkMsg || err.message;

    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const contactAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getTags: () => api.get('/contacts/tags'),
  add: (data) => api.post('/contacts', data),
  import: (data) => api.post('/contacts/import', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  remove: (id) => api.delete(`/contacts/${id}`),
};

export const broadcastAPI = {
  getAll: (params) => api.get('/broadcasts', { params }),
  getStats: () => api.get('/broadcasts/stats'),
  create: (data) => api.post('/broadcasts', data),
  getById: (id) => api.get(`/broadcasts/${id}`),
  send: (id) => api.post(`/broadcasts/${id}/send`),
  getLogs: (id, params) => api.get(`/broadcasts/${id}/logs`, { params }),
  remove: (id) => api.delete(`/broadcasts/${id}`),
};

export const notificationAPI = {
  sendEvent: (data) => api.post('/notify/event', data),
  sendProgramme: (data) => api.post('/notify/programme', data),
  sendBulkPayment: (data) => api.post('/notify/bulk-payment', data),
  getLogs: (params) => api.get('/notify/logs', { params }),
  resend: (id) => api.post(`/notify/resend/${id}`),
};

export default api;
