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
    },
  },
});
