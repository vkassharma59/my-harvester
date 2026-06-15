import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Use the shared package's TS source (ESM) so Vite/Rollup can statically
      // resolve enum value exports (e.g. Role); the published dist is CommonJS
      // and only suits the NestJS API.
      '@wh/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: { port: 5174 },
});
