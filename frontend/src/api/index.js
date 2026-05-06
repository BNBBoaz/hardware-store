// API Layer
// All communication with the backend goes through here.
// Components never call fetch() directly — they use these functions.

import axios from 'axios';

// Create axios instance with base URL and default headers
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────
// Automatically adds the JWT token to every request.
// The component doesn't need to worry about it.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor ──────────────────────
// If any request gets a 401 (unauthorized),
// clear the token and redirect to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me:       ()     => api.get('/auth/me'),
};

// ── Products ──────────────────────────────────
export const productsAPI = {
  getAll:    (params) => api.get('/products', { params }),
  getOne:    (id)     => api.get(`/products/${id}`),
  create:    (data)   => api.post('/products', data),
  update:    (id, data) => api.put(`/products/${id}`, data),
  lowStock:  ()       => api.get('/products/low-stock'),
};

// ── Categories ────────────────────────────────
export const categoriesAPI = {
  getAll:  ()       => api.get('/categories'),
  create:  (data)   => api.post('/categories', data),
  update:  (id, data) => api.put(`/categories/${id}`, data),
  delete:  (id)     => api.delete(`/categories/${id}`),
};

// ── Sales ─────────────────────────────────────
export const salesAPI = {
  create:  (data)   => api.post('/sales', data),
  getAll:  (params) => api.get('/sales', { params }),
  getOne:  (id)     => api.get(`/sales/${id}`),
  summary: (params) => api.get('/sales/summary', { params }),
};

// ── Customers ─────────────────────────────────
export const customersAPI = {
  getAll:       (params) => api.get('/customers', { params }),
  getOne:       (id)     => api.get(`/customers/${id}`),
  create:       (data)   => api.post('/customers', data),
  update:       (id, data) => api.put(`/customers/${id}`, data),
  outstanding:  ()       => api.get('/customers/outstanding'),
  recordPayment: (id, data) => api.post(`/customers/${id}/payments`, data),
};

// ── Suppliers ─────────────────────────────────
export const suppliersAPI = {
  getAll:         (params) => api.get('/suppliers', { params }),
  create:         (data)   => api.post('/suppliers', data),
  update:         (id, data) => api.put(`/suppliers/${id}`, data),
  getOrders:      ()       => api.get('/suppliers/orders'),
  createOrder:    (id, data) => api.post(`/suppliers/${id}/orders`, data),
  receiveStock:   (orderId, data) => api.put(`/suppliers/orders/${orderId}/receive`, data),
  pay:            (id, data) => api.post(`/suppliers/${id}/payments`, data),
};

// ── Reports ───────────────────────────────────
export const reportsAPI = {
  dashboard:   ()       => api.get('/reports/dashboard'),
  sales:       (params) => api.get('/reports/sales', { params }),
  stock:       (params) => api.get('/reports/stock', { params }),
  bestSellers: (params) => api.get('/reports/best-sellers', { params }),
};

export default api;