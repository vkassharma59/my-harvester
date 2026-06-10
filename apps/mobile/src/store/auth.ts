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
  login: (token: string, admin: Admin) => Promise<void>;
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

  login: async (token, admin) => {
    tokenHolder.set(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
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
