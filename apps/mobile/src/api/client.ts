import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/config';
import { useSubscriptionBlock } from '@/offline/subscription';
import { tokenHolder } from './token';

const REQUEST_TIMEOUT = 12000;

export const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
});

// A stalled socket — common against a local dev server over Wi-Fi, especially
// on iOS — sometimes never fires axios's XHR timeout, leaving spinners stuck
// forever (the user has to pull-to-refresh to recover). An AbortController
// guarantees every request rejects within REQUEST_TIMEOUT, so the UI always
// recovers: queries error/retry, save buttons reset, refresh spinners clear.
type TimedConfig = InternalAxiosRequestConfig & { __timer?: ReturnType<typeof setTimeout> };

const clearTimer = (config?: TimedConfig) => {
  if (config?.__timer) clearTimeout(config.__timer);
};

// Attach an abort timer + the bearer token to every request.
api.interceptors.request.use((config: TimedConfig) => {
  const controller = new AbortController();
  config.signal = controller.signal;
  config.__timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const token = tokenHolder.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    clearTimer(response.config as TimedConfig);
    // A successful write means the subscription paywall (if any) has lifted.
    if (response.config.method && response.config.method.toLowerCase() !== 'get') {
      useSubscriptionBlock.getState().clear();
    }
    return response;
  },
  (error: AxiosError) => {
    clearTimer(error.config as TimedConfig);
    const status = error.response?.status;
    if (status === 401) {
      tokenHolder.handleUnauthorized();
    } else if (status === 402) {
      // Subscription expired/suspended — writes are blocked until renewal.
      const code = (error.response?.data as { code?: string } | undefined)?.code;
      useSubscriptionBlock.getState().block(code);
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
    // ECONNABORTED = axios timeout; ERR_CANCELED = our AbortController fired.
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
      return 'The server took too long to respond. Pull to refresh or try again.';
    }
    if (!error.response) return 'Cannot reach the server. Check your connection / API URL.';
    return error.message;
  }
  // Non-network errors thrown locally (e.g. offline entry blocked) carry their
  // own readable message.
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
