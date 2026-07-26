import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Scoped to the FR-014 PWA slice (docs/HANDOVER.md §6) plus the
      // Sprint 01 auth/assisted code. The rest of the app predates test
      // infrastructure and is out of scope here.
      include: [
        'src/config/pwa-config.ts',
        'src/services/offline-draft-storage.service.ts',
        'src/services/pwa.service.ts',
        'src/services/api.service.ts',
        'src/stores/usePwaStore.ts',
        // Sprint 01 — auth & roles
        'src/services/siaga-auth.service.ts',
        'src/services/assisted.service.ts',
        'src/stores/useAuthStore.ts',
        'src/stores/useAssistedStore.ts',
        'src/utils/parse-api-error.ts',
        'src/features/shared/auth/utils/login-error.ts',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
})
