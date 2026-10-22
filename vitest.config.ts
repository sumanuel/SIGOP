import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      JWT_ACCESS_SECRET: 'secreto-de-prueba-access',
      JWT_REFRESH_SECRET: 'secreto-de-prueba-refresh',
    },
  },
});
