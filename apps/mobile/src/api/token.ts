/**
 * A tiny in-memory token holder so the axios interceptor can read the current
 * JWT without importing the auth store (avoids a circular dependency). The auth
 * store is the source of truth and keeps this in sync.
 */
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const tokenHolder = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
  setUnauthorizedHandler: (fn: () => void) => {
    onUnauthorized = fn;
  },
  handleUnauthorized: () => {
    onUnauthorized?.();
  },
};
