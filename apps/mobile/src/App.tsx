import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authApi } from '@/api/endpoints';
import { queryClient } from '@/api/queryClient';
import { OfflineBanner } from '@/components/OfflineBanner';
import { loadStoredLanguage } from '@/i18n';
import { RootNavigator } from '@/navigation/RootNavigator';
import { initConnectivity } from '@/offline/connectivity';
import { flushOutbox, initSync } from '@/offline/sync';
import { useAuth } from '@/store/auth';

// Persist the React Query cache so screens still render offline after a cold start.
const persister = createAsyncStoragePersister({ storage: AsyncStorage });

export default function App() {
  useEffect(() => {
    void loadStoredLanguage();
    // Offline support: track connectivity and drain the outbox in the background.
    initConnectivity();
    initSync();
  }, []);

  // When the app returns to the foreground, refresh the profile (harvester
  // assignments may have changed), re-fetch data, and flush any queued offline
  // changes.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void flushOutbox();
      const { token, setAdmin } = useAuth.getState();
      if (!token) return;
      authApi.me().then(setAdmin).catch(() => {});
      void queryClient.invalidateQueries();
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
          <StatusBar style="light" />
          <NavigationContainer>
            <View style={{ flex: 1 }}>
              <RootNavigator />
              <OfflineBanner />
            </View>
          </NavigationContainer>
        </PersistQueryClientProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
