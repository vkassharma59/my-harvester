import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OfflinePrefsState {
  /**
   * Whether data entry is allowed while offline. Off by default — users opt in
   * from Settings before the app will queue changes made without a connection.
   */
  offlineEntryEnabled: boolean;
  setOfflineEntryEnabled: (enabled: boolean) => void;
}

export const useOfflinePrefs = create<OfflinePrefsState>()(
  persist(
    (set) => ({
      offlineEntryEnabled: false,
      setOfflineEntryEnabled: (enabled) => set({ offlineEntryEnabled: enabled }),
    }),
    { name: 'wh-offline-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Non-reactive read for use outside React (e.g. the enqueue layer). */
export const offlineEntryEnabled = (): boolean => useOfflinePrefs.getState().offlineEntryEnabled;
