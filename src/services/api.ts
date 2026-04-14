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
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 401 && typeof window !== 'undefined') {
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
};

export default api;
