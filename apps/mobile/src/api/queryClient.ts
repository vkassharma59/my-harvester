import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Keep cached data for a day so screens still render offline after a cold
      // start (the cache is persisted to AsyncStorage — see App.tsx).
      gcTime: 24 * 60 * 60 * 1000,
      // We manage offline ourselves (outbox + persisted cache). Without this,
      // React Query PAUSES queries whenever onlineManager thinks we're offline
      // — and iOS's NetInfo reachability probe gives false negatives, leaving
      // page spinners stuck forever. 'always' runs the query regardless.
      networkMode: 'always',
    },
    mutations: {
      // Same reason: stop save/update spinners getting stuck when iOS reports a
      // false "offline". Our mutation fns enqueue to the outbox and resolve
      // immediately, so they never actually block on the network here.
      networkMode: 'always',
    },
  },
});
