# Wheat Harvester Management

A multi-tenant management app for wheat-harvesting business owners — track
harvesting operations, customers, expenses, labour, jobs and earnings.

Monorepo (npm workspaces):

| Package | Path | Description |
| ------- | ---- | ----------- |
| `@wh/shared` | [`packages/shared`](packages/shared) | Shared TypeScript enums + types (single source of truth) |
| `@wh/api` | [`apps/api`](apps/api) | NestJS + MongoDB REST API ([README](apps/api/README.md)) |
| `@wh/mobile` | [`apps/mobile`](apps/mobile) | Expo / React Native app (iOS + Android) ([README](apps/mobile/README.md)) |

## Stack
- **Mobile:** Expo SDK 54 (React Native 0.81), React Navigation, TanStack Query, Zustand
- **API:** NestJS 10, Mongoose, JWT auth, per-tenant data isolation
- **Database:** MongoDB Atlas

## Getting started

```bash
npm install                 # from the repo root
npm run shared:build        # build the shared types package

# API — configure apps/api/.env first (see apps/api/.env.example)
npm run api:dev             # http://localhost:3000/api/v1

# Mobile — set EXPO_PUBLIC_API_URL to your machine's LAN IP
npm run mobile:start
```

Each **owner** (super admin) is an isolated tenant and can add staff admins who
share the owner's data. Owners are seeded manually:

```bash
npm run seed:owner -w @wh/api -- <email> <password> <phone> "Owner Name"
```

## Notes
- Secrets live in `apps/api/.env` (gitignored) — never commit them.
- See each app's README for endpoint and screen details.
