# Wheat Harvester — Mobile (Expo / React Native)

Admin-only mobile app (iOS + Android) for managing harvesting operations,
customers, expenses, labour, jobs and earnings. Talks to the `@wh/api` backend.

## Stack

- **Expo SDK 51** (React Native 0.74), TypeScript
- **React Navigation** — bottom tabs + native stacks
- **TanStack Query** — server state / caching
- **Zustand** — auth session + selected-harvester
- **axios** — API client with bearer-token + 401 handling
- **expo-secure-store** — persists the JWT
- **expo-contacts** — import customers from the device contact list

## Run

```bash
# from the repo root — build shared types first
npm run shared:build

# point the app at your API (see below), then:
npm run mobile:start      # Expo dev server (press a / i, or scan QR)
npm run mobile:android
npm run mobile:ios
```

### Pointing the app at the API

`localhost` on a phone/emulator is the device itself, not your dev machine.
Set the API URL one of two ways:

1. **Env var (recommended):** create `apps/mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api/v1
   ```
   (use your machine's LAN IP; find it with `ipconfig`).
2. **app.json:** edit `expo.extra.apiUrl`.

The Android emulator can also use `http://10.0.2.2:3000/api/v1`.

Log in with the bootstrap admin from the API's `.env`
(`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).

## Structure

```
src/
  api/         axios client, token holder, typed endpoints, query client
  components/  Screen, Button, TextField, Select, DateField, Card, StatTile, States, HarvesterPicker
  hooks/       useHarvesterOptions
  navigation/  RootNavigator (auth gate), AppTabs, per-tab stacks, types
  screens/     Login, Dashboard, harvesters/, customers/, expenses/, labour/, harvests/, more/
  store/       auth (zustand + secure-store), harvester (selected)
  theme/       colors, spacing, radius, fonts
  utils/       format (currency, date, enum labels)
  App.tsx      providers + navigation root
```

## Navigation map

- **Dashboard** tab — financial / harvesting / expense / labour summary; harvester picker in header.
- **Harvests** tab — list of jobs → add/edit job (live amount preview for both harvest types).
- **Customers** tab — searchable list → customer ledger (bill / paid / outstanding, plots, payments, record payment) → add customer (with contact import).
- **Expenses** tab — list (scoped by selected harvester) → add/edit expense.
- **More** tab — Harvesters (activate/deactivate), Labour, Reports, Settings, Sign out.

The harvester selected in the header is shared app-wide and scopes the dashboard,
expenses, labour, harvests and reports; it also pre-fills the harvester on new records.

## Notes

- TypeScript is pinned to the monorepo version (excluded from `expo install` checks);
  `npx expo-doctor` passes 17/17.
- New Architecture is off for SDK 51 stability.
