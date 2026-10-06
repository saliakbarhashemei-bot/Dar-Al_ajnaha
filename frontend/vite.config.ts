import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: {
    port: 5173,
    // Fail loudly instead of silently moving to 5174, etc. A shifted port
    // breaks Sanctum stateful auth, because the backend only trusts the
    // origins listed in SANCTUM_STATEFUL_DOMAINS.
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      // Sanctum's CSRF cookie endpoint lives at the app root, not under /api.
      '/sanctum': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/types/**',
        'src/i18n.ts',
        'src/locales/**',
        '**/*.d.ts',
      ],
      thresholds: {
        // Phase 7 §1.2 line-coverage targets.
        'src/services/**': { lines: 90 },
        'src/hooks/**': { lines: 80 },
        'src/components/**': { lines: 80 },
        'src/pages/**': { lines: 70 },
      },
    },
  },
});
