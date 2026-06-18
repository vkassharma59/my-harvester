import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { Admin } from '@wh/shared';
import { authApi } from '@/api/endpoints';
import { tokenHolder } from '@/api/token';

const TOKEN_KEY = 'wh_access_token';

interface AuthState {
  admin: Admin | null;
  token: string | null;
  /** True until we've checked SecureStore on app launch. */
  bootstrapping: boolean;
  restore: () => Promise<void>;
  /** `remember` (default true) persists the session across app restarts; when
   *  false the token is kept only in memory for this run. */
  login: (token: string, admin: Admin, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setAdmin: (admin: Admin) => void;
}

export const useAuth = create<AuthState>((set) => ({
  admin: null,
  token: null,
  bootstrapping: true,

  restore: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ bootstrapping: false });
        return;
      }
      tokenHolder.set(token);
      // Validate the token + load the current profile.
      const admin = await authApi.me();
      set({ token, admin, bootstrapping: false });
    } catch {
      tokenHolder.set(null);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ token: null, admin: null, bootstrapping: false });
    }
  },

  login: async (token, admin, remember = true) => {
    tokenHolder.set(token);
    // Remembered → persist for auto-login next launch; otherwise drop any stored
    // token so the session lives only in memory for this run.
    if (remember) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token, admin });
  },

  logout: async () => {
    tokenHolder.set(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, admin: null });
  },

  setAdmin: (admin) => set({ admin }),
}));

// When any request returns 401, the interceptor calls this to force logout.
tokenHolder.setUnauthorizedHandler(() => {
  void useAuth.getState().logout();
});
