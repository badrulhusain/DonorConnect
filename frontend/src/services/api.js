import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('at_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — force logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('at_token');
      localStorage.removeItem('at_admin');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Donors
export const donorAPI = {
  getAll: (params) => api.get('/donors', { params }),
  add: (data) => api.post('/donors', data),
  update: (id, data) => api.put(`/donors/${id}`, data),
  remove: (id) => api.delete(`/donors/${id}`),
  analytics: () => api.get('/donors/analytics'),
  exportCSV: () =>
    api.get('/donors/export/csv', { responseType: 'blob' }),
};

// Payments
export const paymentAPI = {
  markPaid: (data) => api.post('/mark-paid', data),
  bulkMarkPaid: (data) => api.post('/mark-paid/bulk', data),
  getLogs: (params) => api.get('/logs', { params }),
};

export default api;
