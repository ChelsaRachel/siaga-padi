---
name: reactjs-manage-env
description: Create, add, or update environment variables for the ReactJS stack. Use whenever a task requires a new env key, modifying .env, or wiring env values into src/types/env.ts. Enforces REACT_ prefix convention and syncs .env with .env.example.
---

# ReactJS Manage Env Skill

Use this skill whenever you need to:
- Add a new env key to the project
- Create `.env` from scratch for a new app
- Sync `.env.example` after changes
- Wire env values into `src/types/env.ts`

---

## Step 1 — Locate the App Target

Identify which app under `apps/` is being worked on (e.g. `apps/web/`).

Env files live inside a dedicated **`env/`** subfolder at the app root — not at the app root directly:

```
apps/{app}/
├── env/
│   ├── .env                  ← development (gitignored)
│   ├── .env.example          ← placeholder, committed to git
│   ├── .env.staging          ← staging build (gitignored)
│   └── .env.production       ← production build (gitignored)
├── src/
│   └── types/
│       └── env.ts            ← typed interface & accessor (committed)
└── rspack.dev.ts             ← loads ./env/.env
└── rspack.prod.ts            ← loads ./env/.env.{ENV_TARGET}
```

**How rspack loads env:**
- **Dev** (`rspack.dev.ts`): `dotenv.config({ path: './env/.env' })`
- **Prod** (`rspack.prod.ts`): `dotenv.config({ path: './env/.env.' + process.env.ENV_TARGET })`
  - `ENV_TARGET=staging` → loads `./env/.env.staging`
  - `ENV_TARGET=production` → loads `./env/.env.production`

If `env/` folder, `.env.example`, or `src/types/env.ts` does not exist, create them in this step before adding any key.

---

## Step 2 — Naming Convention

All env keys for the ReactJS stack **must** use the `REACT_` prefix.

| Type | Pattern | Example |
|------|---------|---------|
| API endpoint | `REACT_API_<SERVICE>_URL` | `REACT_API_BASE_URL` |
| Auth / secret token | `REACT_<SERVICE>_TOKEN` | `REACT_MAPBOX_TOKEN` |
| Feature flag | `REACT_FEATURE_<NAME>` | `REACT_FEATURE_DARK_MODE` |
| Third-party key | `REACT_<SERVICE>_KEY` | `REACT_SENTRY_DSN` |
| App-level config | `REACT_APP_<NAME>` | `REACT_APP_NAME` |

**Rules:**
- ALL_CAPS with underscores only — no camelCase, no hyphens
- Never store secrets that must stay server-side (private keys, DB passwords) in a React env file
- Never commit `.env` — only `.env.example` with placeholder values

---

## Step 3 — Write to env/ Files

Always update **all relevant files** in the same unit of work. Files are located in `apps/{app}/env/`.

| File | Purpose | Committed? |
|------|---------|------------|
| `env/.env` | Dev values (loaded by `rspack.dev.ts`) | ❌ gitignored |
| `env/.env.example` | Placeholder keys, no real values | ✅ committed |
| `env/.env.staging` | Staging build values | ❌ gitignored |
| `env/.env.production` | Production build values | ❌ gitignored |

**Minimum required:** always update `.env` + `.env.example`. Add to `.env.staging` / `.env.production` if the key is needed in those environments.

**env/.env** — dev values:
```
# API
REACT_API_BASE_URL=https://dev-api.example.com

# Map
REACT_MAPBOX_TOKEN=pk.your_real_token_here
```

**env/.env.example** — placeholder (committed):
```
# API
REACT_API_BASE_URL=

# Map
REACT_MAPBOX_TOKEN=
```

**Grouping rule:** Group keys by service/domain, separated by a blank line with a `# Comment` header. Keep the same grouping order across all env files.

---

## Step 4 — Wire into src/types/env.ts

After adding keys, update `src/types/env.ts` to expose typed accessors.

**Template for env.ts:**
```ts
const env = {
  api: {
    baseUrl: process.env.REACT_API_BASE_URL ?? '',
  },
  map: {
    mapboxToken: process.env.REACT_MAPBOX_TOKEN ?? '',
  },
  app: {
    name: process.env.REACT_APP_NAME ?? 'App',
  },
} as const;

export default env;
```

**Rules for env.ts:**
- Use `process.env.REACT_*` — the Rspack `DefinePlugin` injects all `process.env` at build time
- Always provide a fallback with `?? ''` or a safe default — never leave bare `process.env.*`
- Group keys to mirror the `.env` grouping
- Export as a single default object `env` — consumers import `env.api.baseUrl`, not raw `process.env`
- Never import `process.env` directly in component files — always go through `src/types/env.ts`

---

## Step 5 — Verify Rspack Injection

The boilerplate reads `.env` via `dotenv` and injects each key individually into `process.env.*` using `rspack.DefinePlugin`. The pattern in `rspack.dev.ts`:

```ts
...Object.entries(dotenv.config({ path: './env/.env' }).parsed || {}).reduce((acc, [key, value]) => {
  acc[`process.env.${key}`] = JSON.stringify(value);
  return acc;
}, {}),
```

This means **all keys in `env/.env` are automatically injected** — no manual registration needed in rspack config. Just adding a key to the env file is sufficient.

Two built-in keys are always injected by rspack (do not put these in `.env`):
- `process.env.NODE_ENV` — set by mode (`development` / `production`)
- `process.env.ENV_TARGET` — set via shell before build (`staging`, `production`)

---

## Step 6 — Validate Before Closing

Before completing the task, run this checklist:

- [ ] Key follows `REACT_` prefix and ALL_CAPS naming
- [ ] `.env` updated with real/dev value
- [ ] `.env.example` updated with placeholder (value empty or safe default)
- [ ] `src/types/env.ts` has a typed accessor for the new key
- [ ] No `process.env.*` calls outside `src/types/env.ts`
- [ ] `.env` is in `.gitignore` (verify, do not add if already there)

---

## Anti-patterns

| ❌ Do NOT | ✅ Do instead |
|-----------|--------------|
| `VITE_API_URL` | `REACT_API_URL` — this stack uses Rspack, not Vite |
| `process.env.REACT_API_URL` in a component | `import env from '@/types/env'` then `env.api.baseUrl` |
| Commit `.env` with real secrets | Commit only `.env.example` |
| Skip `.env.example` update | Always sync both files together |
| Use camelCase key: `REACT_apiBaseUrl` | Use ALL_CAPS: `REACT_API_BASE_URL` |
| Store DB password or private key | Server-side secrets never go in frontend env |
