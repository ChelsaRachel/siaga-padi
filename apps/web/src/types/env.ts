/**
 * Typed env accessor — the ONLY place `process.env.*` may be read.
 * Keys are injected at build time by rspack DefinePlugin from `env/.env`
 * (dev) or `env/.env.{ENV_TARGET}` (staging/production builds).
 *
 * Never read `process.env` directly in components, services, or stores —
 * always import this module: `import env from '@/types/env'`.
 */
const env = {
  api: {
    /** Axios baseURL — dev proxy rewrites `/api/v1/apps/*` to the backend. */
    baseUrl: process.env.REACT_API_BASE_URL || '/api/v1',
  },
} as const

export default env
