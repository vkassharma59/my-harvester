import { create } from 'zustand';

/**
 * Tracks whether the tenant's subscription is blocking writes. Set when any
 * write gets HTTP 402 from the API (SUBSCRIPTION_EXPIRED / SUBSCRIPTION_SUSPENDED)
 * and cleared as soon as a write succeeds again (after the owner renews). Reads
 * keep working throughout, so the app stays usable in a read-only mode.
 *
 * Deliberately not persisted: it re-derives itself on the next write attempt, so
 * a restart never shows a stale paywall while the user is actually paid up.
 */
interface SubscriptionBlockState {
  blocked: boolean;
  code: string | null;
  block: (code?: string | null) => void;
  clear: () => void;
}

export const useSubscriptionBlock = create<SubscriptionBlockState>((set) => ({
  blocked: false,
  code: null,
  block: (code) => set({ blocked: true, code: code ?? null }),
  clear: () => set((s) => (s.blocked ? { blocked: false, code: null } : s)),
}));
