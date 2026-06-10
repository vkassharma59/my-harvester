import Constants from 'expo-constants';

/**
 * API base URL resolution order:
 *  1. EXPO_PUBLIC_API_URL env var (great for `.env` / EAS builds)
 *  2. app.json > expo.extra.apiUrl
 *  3. localhost fallback
 *
 * NOTE: on a physical device or Android emulator, `localhost` points at the
 * device itself, not your dev machine. Set EXPO_PUBLIC_API_URL to your
 * machine's LAN IP, e.g. http://192.168.1.20:3000/api/v1
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:3000/api/v1';
