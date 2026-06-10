import axios, { AxiosError } from 'axios';
import { API_URL } from '@/config';
import { tokenHolder } from './token';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = tokenHolder.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, kick the user back to login.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenHolder.handleUnauthorized();
    }
    return Promise.reject(error);
  },
);

/** Normalises an axios error into a readable message for the UI. */
export function apiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond.';
    if (!error.response) return 'Cannot reach the server. Check your connection / API URL.';
    return error.message;
  }
  return fallback;
}
