import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/**
 * Wire device connectivity into React Query's onlineManager so it is the single
 * source of truth for "are we online". Call once at startup.
 */
export function initConnectivity(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // Base it on the radio connection only. `isInternetReachable` is a probe
      // that gives false negatives on iOS, which would wrongly mark us offline
      // and stop the outbox from ever flushing. Treat unknown (null) as online.
      setOnline(state.isConnected !== false);
    }),
  );
}

export const isOnline = (): boolean => onlineManager.isOnline();

/** Reactive online flag for components (e.g. the offline banner). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}
