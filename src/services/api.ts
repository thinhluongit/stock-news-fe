import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { NewsParams } from '../types';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api',
  timeout: 10_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: unknown) => {
    const axiosErr = err as { response?: { status?: number }; config?: { url?: string } };
    const status = axiosErr.response?.status;
    const url    = axiosErr.config?.url ?? '';
    // Skip redirect for /auth/me — fetchCurrentUser.rejected already handles
    // the "no token" case by setting initialized=true without navigating.
    // Redirecting here would cause an infinite reload loop on public pages.
    if (status === 401 && typeof window !== 'undefined' && !url.includes('/auth/me')) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data: unknown) => api.post('/auth/register', data),
  login:    (data: unknown) => api.post('/auth/login', data),
  getMe:    ()              => api.get('/auth/me'),
  updateProfile: (data: unknown) => api.patch('/auth/me', data),
};

export const newsApi = {
  getAll:    (params?: NewsParams | Record<string, unknown>) => api.get('/news', { params }),
  getBySlug: (slug: string)                                  => api.get(`/news/${slug}`),
  create:    (data: unknown)                                 => api.post('/news', data),
  update:    (id: string, data: unknown)                     => api.put(`/news/${id}`, data),
  remove:    (id: string)                                    => api.delete(`/news/${id}`),
};

export const categoryApi = {
  getAll:    ()                           => api.get('/categories'),
  getBySlug: (slug: string)              => api.get(`/categories/${slug}`),
  create:    (data: unknown)             => api.post('/categories', data),
  update:    (id: string, data: unknown) => api.put(`/categories/${id}`, data),
  remove:    (id: string)                => api.delete(`/categories/${id}`),
};

export const stockApi = {
  getAll:       (params?: unknown) => api.get('/stocks', { params }),
  getBySymbol:  (symbol: string)                   => api.get(`/stocks/${symbol}`),
  getStockNews: (symbol: string, params?: Record<string, unknown>) => api.get(`/stocks/${symbol}/news`, { params }),
  create:       (data: unknown)                    => api.post('/stocks', data),
  updatePrice:  (symbol: string, data: unknown)    => api.patch(`/stocks/${symbol}/price`, data),
  remove:       (symbol: string)                   => api.delete(`/stocks/${symbol}`),
};

export const adminApi = {
  getStats:     ()                                  => api.get('/admin/stats'),
  getUsers:     (params?: Record<string, unknown>)  => api.get('/admin/users', { params }),
  getUser:      (id: string)                        => api.get(`/admin/users/${id}`),
  updateUser:   (id: string, data: unknown)         => api.patch(`/admin/users/${id}`, data),
  deleteUser:   (id: string)                        => api.delete(`/admin/users/${id}`),
  toggleStatus: (id: string)                        => api.patch(`/admin/users/${id}/status`),
};

const fileUploadConfig = { timeout: 120_000 };

export const postsApi = {
  getAll:       (params?: Record<string, unknown>) => api.get('/posts', { params }),
  getById:      (id: string)                       => api.get(`/posts/${id}`),
  create:       (data: FormData | Record<string, unknown>) =>
    api.post('/posts', data, data instanceof FormData ? fileUploadConfig : undefined),
  update:       (id: string, data: FormData | Record<string, unknown>) =>
    api.put(`/posts/${id}`, data, data instanceof FormData ? fileUploadConfig : undefined),
  updateStatus: (id: string, doc_status: 0 | 1 | 2) => api.patch(`/posts/${id}/status`, { doc_status }),
  remove:       (id: string)                       => api.delete(`/posts/${id}`),
};

export default api;
