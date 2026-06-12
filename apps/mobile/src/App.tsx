import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { authApi } from '@/api/endpoints';
import { queryClient } from '@/api/queryClient';
import { loadStoredLanguage } from '@/i18n';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAuth } from '@/store/auth';

export default function App() {
  useEffect(() => {
    void loadStoredLanguage();
  }, []);

  // When the app returns to the foreground, refresh the profile (harvester
  // assignments may have changed) and re-fetch data so changes made elsewhere
  // — e.g. the super admin assigning a harvester — show without re-login.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const { token, setAdmin } = useAuth.getState();
      if (!token) return;
      authApi.me().then(setAdmin).catch(() => {});
      void queryClient.invalidateQueries();
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
