# Env Template — ReactJS Stack

Gunakan file ini sebagai referensi template env files untuk project ReactJS.
Semua file env berada di dalam folder `env/` di root app.

---

## Struktur Folder

```
apps/{app}/env/
├── .env              ← dev (gitignored)
├── .env.example      ← placeholder, committed
├── .env.staging      ← staging build (gitignored)
└── .env.production   ← production build (gitignored)
```

---

## Template env/.env.example (committed)

```env
# App
REACT_APP_NAME=
REACT_APP_ENV=

# API
REACT_API_BASE_URL=

# Auth
REACT_AUTH_TOKEN_KEY=

# Map (Mapbox)
REACT_MAPBOX_TOKEN=

# Feature Flags
REACT_FEATURE_DARK_MODE=

# Monitoring / Analytics
REACT_SENTRY_DSN=
```

## Template env/.env (dev, gitignored)

```env
# App
REACT_APP_NAME=MyApp
REACT_APP_ENV=development

# API
REACT_API_BASE_URL=https://dev-api.example.com

# Auth
REACT_AUTH_TOKEN_KEY=auth_token

# Map (Mapbox)
REACT_MAPBOX_TOKEN=pk.your_dev_token_here

# Feature Flags
REACT_FEATURE_DARK_MODE=false

# Monitoring / Analytics
REACT_SENTRY_DSN=
```

---

## Template src/types/env.ts

```ts
const env = {
  app: {
    name: process.env.REACT_APP_NAME ?? 'App',
    env: process.env.REACT_APP_ENV ?? 'development',
  },
  api: {
    baseUrl: process.env.REACT_API_BASE_URL ?? '',
  },
  auth: {
    tokenKey: process.env.REACT_AUTH_TOKEN_KEY ?? 'auth_token',
  },
  map: {
    mapboxToken: process.env.REACT_MAPBOX_TOKEN ?? '',
  },
  feature: {
    darkMode: process.env.REACT_FEATURE_DARK_MODE === 'true',
  },
  monitoring: {
    sentryDsn: process.env.REACT_SENTRY_DSN ?? '',
  },
} as const;

export default env;
```

---

## Usage in Component

```ts
import env from '@/config/env';

const apiUrl = env.api.baseUrl;
const token = env.map.mapboxToken;
```
