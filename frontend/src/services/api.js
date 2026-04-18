import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('at_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

export default api;
