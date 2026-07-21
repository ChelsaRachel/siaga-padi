# AI Agent Guide — Web (React + Rspack)

Quick start guide for AI agents working with this boilerplate.

## 🚀 First Time Setup

Read these files **every time before writing any code**, in order:

1. **This file** (`AI_GUIDE.md`) — Quick start and navigation
2. **`skills/reactjs-architecture/SKILL.md`** — Folder layout, file placement, naming conventions 

Then load additional skill(s) per task (see Documentation Map below).

## 📖 Documentation Map

### Skills (Load Per Task)

| File | Purpose | Load When |
|------|---------|-----------|
| **`skills/reactjs-slicing-ui/SKILL.md`** | Translating Figma/mockup designs into React components — DESIGN.md token chain, shadcn behavior-first primitives, component hierarchy | Building or refactoring any UI component or page |
| **`skills/reactjs-design-system/SKILL.md`** | Apply active design system — shadcn token/variant wiring, CSS variables, dark mode, DESIGN.md composition patterns | Fixing visual drift, shadcn default styling, font/color issues, or design token compliance |
| **`skills/reactjs-api-design/SKILL.md`** | API design reference — endpoint constants, request/response DTOs, response envelope types, `fusion-openapi.json` contract | Writing service files, defining `API_ENDPOINTS`, or typing request/response payloads |
| **`skills/reactjs-service/SKILL.md`** | Service files, `createResourceService`, CRUD pattern | Writing services, calling API |
| **`skills/reactjs-state-management/SKILL.md`** | Zustand stores, global state patterns | Creating/modifying state stores |
| **`skills/reactjs-error-handling/SKILL.md`** | Error boundaries, try-catch, error states | Any async function, API call, `useEffect` |
| **`skills/reactjs-form/SKILL.md`** | React Hook Form + Yup validation | Implementing forms |
| **`skills/reactjs-features/SKILL.md`** | Scaffold domain feature folder (types → store → hook → component) | Creating new feature under `src/features/` |
| **`skills/reactjs-modules/SKILL.md`** | Scaffold reusable module (used by 2+ features) | Creating/extending `src/modules/` |
| **`skills/reactjs-app-layout/SKILL.md`** | AppLayout, AppHeader, route wiring, non-overlapping shell | Creating layout shell, adding pages/routes |
| **`skills/reactjs-sidebar/SKILL.md`** | AppSidebar, active state, CSS vars, header offset | Building/fixing sidebar or navigation |
| **`skills/reactjs-menu-config/SKILL.md`** | `APP_MENU`, `ADMINISTRATOR_MENU`, all menu IDs and paths | Adding/modifying/rendering menu items |
| **`skills/reactjs-auth-guard/SKILL.md`** | Enable/disable AuthGuard, route protection | Setting up/removing auth guards |
| **`skills/reactjs-responsive/SKILL.md`** | Mobile-first layout, breakpoints | New page/component, fixing mobile layout |
| **`skills/reactjs-icon/SKILL.md`** | Phosphor Web CSS usage, `renderIcon()` | Adding/changing icons |
| **`skills/reactjs-data-display/SKILL.md`** | DataTable, DataList, infinite scroll, pagination | Rendering lists, tables, paginated data |
| **`skills/reactjs-chart/SKILL.md`** | Charts data visualization | Building any chart or graph UI |
| **`skills/reactjs-map/SKILL.md`** | Mapbox GL JS — layers, popup, legend, markers, live feed | Building any map-based page or feature |
| **`skills/reactjs-tactical-map/SKILL.md`** | Tactical command map — domain override on `reactjs-map` | Building command/tactical UI |
| **`skills/reactjs-dynamic-filter/SKILL.md`** | Dynamic filter system — 6 filter types | Adding filter widgets, wiring filter to page |
| **`skills/reactjs-dynamic-widget/SKILL.md`** | Config-driven dashboard widgets — chart/stat/list/table | Building any dashboard widget |
| **`skills/reactjs-switch-theme/SKILL.md`** | Switch between Tactical/Fusion design systems | Switching design system, re-applying tokens |
| **`skills/reactjs-manage-env/SKILL.md`** | Create/add env keys — `REACT_` prefix, `env/` folder structure, `.env` + `.env.example` sync, `src/types/env.ts` typed accessor | Adding any new env variable, creating `env/` for a new app, wiring env into typed config |

### Project Docs

| File                               | Purpose                    | When to Read    |
| ---------------------------------- | -------------------------- | --------------- |
| **`design/design-system.md`**      | Active design resolver     | Any UI work     |
| **`design/web/[theme]/DESIGN.md`** | UI contracts & token rules | Any UI work     |
| **`docs/api-spec.md`**             | Backend endpoint contracts | API integration |

## 🚨 Critical Rules Summary

### 🔴 MOST IMPORTANT: Service Layer

**NEVER call API directly from components — always go through `src/services/`!**

- ✅ Component → Store (Zustand) → Service → API
- ✅ All `fetch`/`axios` calls live in `src/services/` only
- ✅ Use `api-client.ts` (pre-configured axios) — don't create new instances
- ❌ **NEVER `fetch()` or `axios` inside a component or hook**
- ❌ **NEVER manage global state with `useState`** — use Zustand stores

### UI & Styling

- ✅ Use `src/components/ui/` (shadcn/ui) for behavior/accessibility primitives first
- ✅ Override shadcn tokens/variants/classes so final visuals follow active `DESIGN.md`
- ✅ Tailwind classes only — no inline styles, no CSS modules
- ✅ Always support light/dark theme via CSS variables in `styles/tailwind.css`
- ✅ Header, sidebar, and main content must occupy separate non-overlapping layout regions
- ✅ Any page navigation surface must render from `src/config/menu/*`, not hardcoded arrays
- ✅ In the current Tactical shell, primary page navigation lives in `AppSidebar` via `APP_MENU`; `AppHeader` is an operational/status bar unless the task explicitly adds header navigation
- ⚠️ Do not rewrite shadcn behavior. Controlled edits to `src/components/ui/` variants are allowed only for design-system alignment.

### Tech Stack

- ⚠️ **NEVER add new packages** without checking `package.json` first
- ✅ Path alias: always `@/` — never `../../`
- 📦 React 18 · TypeScript · Rspack · Zustand · shadcn/ui · Tailwind

### State & Async

- ✅ Always handle loading + error states on every async operation
- ✅ Zustand for global/shared state, `useState` for local UI state only

## 🎯 Quick Decision Guide

### What kind of feature is this?

```
New page needed?
├─ Public / protected app page  → src/pages/{module}/
│                                 + add to routes/main.routes.tsx
│                                 + add menu entry unless route is explicitly hidden
├─ Admin-only page              → src/pages/administrator/{module}/
│                                 + add to routes/admin.routes.tsx
│                                 + add admin menu entry unless route is explicitly hidden
└─ Auth page                    → src/pages/auth/ + add to routes/auth.routes.tsx
```

### Where does new code go?

```
What are you adding?
├─ Page component         → src/pages/{module}/
├─ Reusable component     → src/components/{module}/
├─ API call               → src/services/{module}.service.ts
├─ Global state           → src/stores/use{Module}Store.ts
├─ TypeScript types       → src/types/{module}.d.ts
├─ Custom hook            → src/hooks/use-{name}.ts
├─ Menu item              → src/config/menu/app.menu.ts or administrator.menu.ts
└─ Utility function       → src/utils/{name}.ts
```

## 📋 Code Generation Workflow

1. ✅ Check `docs/api-spec.md` — understand endpoint contract before writing service
2. ✅ Load skill(s) matching your task (see Documentation Map above)
3. ✅ Check `design/design-system.md` for UI tasks
4. ✅ Define types in `src/types/{module}.d.ts`
5. ✅ Create service in `src/services/{module}.service.ts`
6. ✅ Create store in `src/stores/use{Module}Store.ts` (if shared state needed)
7. ✅ Create page in `src/pages/{module}/`
8. ✅ Register route in `src/routes/`
9. ✅ Add menu entry in `src/config/menu/` for every user-facing page
10. ✅ Skip menu entry only if the prompt/task explicitly says the route is hidden, redirect-only, modal-only, or otherwise non-navigable

## 📁 File Locations

```
{app-root}/
├── env/
│   ├── .env                  ← dev values (gitignored)
│   ├── .env.example          ← placeholder keys (committed)
│   ├── .env.staging          ← staging build (gitignored)
│   └── .env.production       ← production build (gitignored)
src/
├── App.tsx
├── main.tsx
├── components/
│   ├── layouts/            → AppHeader, AppSidebar, AppFooter, AppLayout
│   ├── ui/                 → shadcn/ui primitives; preserve behavior, align variants to DESIGN.md
│   └── wrappers/           → EChart, Mapbox wrappers
├── config/
│   └── menu/               → app.menu.ts, administrator.menu.ts
├── hooks/                  → Custom React hooks
├── modules/
│   ├── data-display/       → Reusable DataTable / DataList (use this for lists)
│   ├── dynamic-filter/     → Filter state management (URL, global, inter-widget)
│   └── dynamic-widget/     → Config-driven dashboard widgets (chart, stat, list, table, card)
├── pages/                  → Route-level page components
│   ├── auth/               → Login, etc.
│   └── dashboard/
├── routes/                 → React Router config
│   ├── index.tsx           → Root router
│   ├── main.routes.tsx     → Protected app routes
│   ├── admin.routes.tsx    → Admin routes
│   ├── auth.routes.tsx     → Public auth routes
│   └── guards/             → AuthGuard, RoleGuard
├── services/               → All API calls live here
│   ├── api-client.ts       → Axios instance — real backend (use this, don't create new)
│   ├── api-endpoints.ts    → Real API path constants
│   ├── api.service.ts      → request() / uploadRequest() helpers
│   ├── auth.service.ts
│   ├── resource.service.ts → Generic CRUD factory (reuse for standard modules)
│   ├── mock-client.ts      → fetch wrapper for public/data/ (POC only, created once)
│   ├── mock-endpoints.ts   → Mock file path constants (add entry per mock file)
│   └── mock.service.ts     → mockRequest() helper — used by all domain services in POC
├── stores/                 → Zustand stores
├── styles/                 → theme.css, variables.css, components.css
├── types/
│   ├── env.ts              → Typed env accessor — consume `env.*` here, never raw `process.env.*` in components
│   └── *.d.ts              → TypeScript .d.ts definitions
└── utils/                  → cn, date-formatter, icon-renderer
```

## 🗂️ Mock Data

Mock data is stored in `public/data/` as **JSON** or **CSV** files and served statically by the dev server.

### Rules

- All mock files go in `public/data/` — never inside `src/`
- Use `.json` for structured records, `.csv` for tabular/export-style data
- Every `.json` mock file **must** follow this envelope structure:

```json
{
  "metaData": {
    "status": true,
    "title": "...",
    "...": "any additional metadata fields"
  },
  "data": []
}
```

> `metaData.status` is required (`boolean`). Add any other metadata fields (title, tahun, total, etc.) as needed. Domain records live in `data[]` — never at the root level.

- Initial mock data is copied from the root `data/` folder into `public/data/` when setting up the project
- In POC scope, this is the **only** data source — no backend calls
- Mock fetches live in `src/services/{module}.service.ts` — **never** inside components, hooks, or stores
- The mock service layer mirrors the real API layer exactly — one infrastructure file per concern, domain services on top
- `apiClient` is reserved for backend API calls; `mockClient` is reserved for `public/data/` static files — never mix them
- **Never** call raw `fetch('/data/...')` in domain services — always go through `mockRequest()`
- One `mockClient` + one `mock-endpoints.ts` for the whole project; each domain gets its **own service** and its **own store**

### Mock Service Layer — parallel to real API layer

| Real API                       | Mock                                | Role                                                          |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------- |
| `api-client.ts`                | `mock-client.ts`                    | HTTP/fetch transport (created once, never edited per-feature) |
| `api-endpoints.ts`             | `mock-endpoints.ts`                 | File path constants (add an entry per mock file)              |
| `api.service.ts` → `request()` | `mock.service.ts` → `mockRequest()` | Typed helper used by domain services                          |
| `{module}.service.ts`          | `{module}.service.ts`               | Domain service (uses `mockRequest`)                           |

**`src/services/mock-client.ts`** — created once per project

```ts
const mockClient = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetch(`/data/${path}`)
    if (!res.ok) throw new Error(`Failed to load mock data: ${path}`)
    return res.json()
  },
}

export default mockClient
```

**`src/services/mock-endpoints.ts`** — add one entry per mock file (analogous to `api-endpoints.ts`)

```ts
export const MOCK_ENDPOINTS = {
  SENTIMENT: 'mock-sentiment.json',
  PENDUDUK: 'mock/data-penduduk.json',
} as const
```

> Never pass raw string literals to `mockRequest()` — always reference `MOCK_ENDPOINTS.*`.

**`src/services/mock.service.ts`** — typed helper (analogous to `api.service.ts` / `request()`)

```ts
import mockClient from './mock-client'

export function mockRequest<T>(path: string): Promise<T> {
  return mockClient.get<T>(path)
}
```

### Folder Convention

```
public/
└── data/
    ├── mock-sentiment.json     ← copied from data/mock-sentiment.json
    ├── mock/
    │   ├── data-penduduk.json  ← copied from data/mock/data-penduduk.json
    │   └── data-sentimen.json  ← copied from data/mock/data-sentimen.json
    └── ...                     ← add new mock files here
```

### Full Chain — mockRequest → Service → Store → Component

**1. Service** (`src/services/sentiment.service.ts`)

```ts
import { mockRequest } from './mock.service'
import { MOCK_ENDPOINTS } from './mock-endpoints'
import type { TSentiment } from '@/types/models'

export const sentimentService = {
  getAll: () => mockRequest<TSentiment[]>(MOCK_ENDPOINTS.SENTIMENT),
}
```

**2. Zustand store** (`src/stores/useSentimentStore.ts`)

```ts
import { create } from 'zustand'
import { sentimentService } from '@/services/sentiment.service'
import type { TSentiment } from '@/types/models'

interface SentimentState {
  data: TSentiment[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export const useSentimentStore = create<SentimentState>((set) => ({
  data: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const data = await sentimentService.getAll()
      set({ data })
    } catch (e) {
      set({ error: (e as Error).message })
    } finally {
      set({ loading: false })
    }
  },
}))
```

**3. Component** (`src/pages/sentiment/SentimentPage.tsx`)

```tsx
import { useEffect } from 'react'
import { useSentimentStore } from '@/stores/useSentimentStore'

export function SentimentPage() {
  const { data, loading, error, fetch } = useSentimentStore()

  useEffect(() => {
    fetch()
  }, [fetch])

  if (loading) return <p>Loading…</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.label}</li>
      ))}
    </ul>
  )
}
```

> **Flow:** Component → store → domain service → `mockRequest()` → `mockClient` → `public/data/`. Never skip a layer. One client, one endpoints file, many services, many stores.

---

## ⚠️ Common Mistakes to Avoid

1. ❌ **API call inside component** — always use `src/services/`
2. ❌ **`useState` for shared state** — use Zustand store
3. ❌ **Relative imports** — always use `@/`
4. ❌ **Rewrite shadcn behavior** — keep behavior/accessibility and adjust tokens/variants/classes only
5. ❌ **Inline styles** — always use Tailwind classes
6. ❌ **Skip loading/error states** — every async operation needs both
7. ❌ **New axios instance** — use `src/services/api-client.ts`
8. ❌ **Raw `fetch('/data/...')` in domain services** — use `mockRequest()` from `src/services/mock.service.ts`
9. ❌ **Raw string path in `mockRequest()`** — always reference `MOCK_ENDPOINTS.*` from `mock-endpoints.ts`
10. ❌ **Flat JSON array at root of mock file** — wrap in `{ metaData: { status: boolean, ... }, data: [] }` envelope
11. ❌ **New package without checking `package.json`** first
12. ❌ **Hardcode colors** — use CSS variables from `styles/tailwind.css`
13. ❌ **Accept raw shadcn defaults as final UI** — align with active `DESIGN.md`
14. ❌ **Let shadcn Sidebar cover the header** — offset fixed sidebar below a full-width topbar
15. ❌ **Finish a user-facing page without wiring navigation** — add route + menu entry together unless the route is explicitly hidden
16. ❌ **Hardcode sidebar/header menu arrays** — add items to `src/config/menu/*`
17. ❌ **Use `VITE_` prefix for env keys** — this stack uses Rspack, prefix must be `REACT_`
18. ❌ **Put `.env` at app root** — env files live in `env/` subfolder (`env/.env`, `env/.env.example`, etc.)
19. ❌ **Call `process.env.*` directly in components** — always go through `src/types/env.ts`
20. ❌ **Add key to `.env` without updating `.env.example`** — always sync both files
21. ❌ **Custom filter component outside `modules/dynamic-filter/`** — use the 18 built-in components; never build a filter from scratch
22. ❌ **Filter state in a domain store** (`useLogStore.filter`, `useAlertStore.filter`, etc.) — filter state must live in the Zustand filter store (`modules/dynamic-filter`) only
23. ❌ **Filter callback prop** (`onFilterChange`) — use `useFilterEmitter`; never pass filter values up via a callback prop
24. ❌ **Writing filter code without `{page}.filter-map.ts`** — this file is required before any filter component is written

## 💡 Pro Tips

1. **`resource.service.ts` is generic** — reuse it for standard CRUD before writing new service
2. **`modules/data-display/`** — use this for any list/table view, don't rebuild
3. **`modules/dynamic-filter/`** — **MANDATORY** for all filter requirements. 18 ready-to-use components, centralized Zustand store, 6 filter types (URL / global / partial / dependent / use-as-filter / exclude-self). Read the `reactjs-dynamic-filter` skill BEFORE writing any filter code. Never build a custom filter component outside this folder.
4. **`modules/dynamic-widget/`** — widget dashboard config-driven; lihat `SKILL.md` dan `REFERENCE.md` di dalamnya
5. **`modules/FILTER_WIDGET_INTEGRATION.md`** — panduan interaksi filter ↔ widget dalam satu halaman
6. **`RoleGuard` + `AuthGuard`** are already built — use them for protected routes
7. **Extend `api.service.ts`** for new services — don't write raw axios calls
8. **Mock layer mirrors real API layer** — `mock-client` / `mock-endpoints` / `mock.service` swap out cleanly for `api-client` / `api-endpoints` / `api.service` when graduating from POC to MVP

## 📞 Quick Commands

```bash
# Check existing API contracts
cat docs/api-spec.md

# Check installed packages
cat package.json

# Check existing stores
ls src/stores/

# Check existing services
ls src/services/

# Check existing types
ls src/types/

# Check route config
cat src/routes/index.tsx
```

## ✅ Success Checklist

Your generated code is good if:

- [ ] No API calls inside components — all in `src/services/`
- [ ] TypeScript types defined in `src/types/`
- [ ] Service extends or follows `api.service.ts` pattern (MVP) or `mock.service.ts` + `MOCK_ENDPOINTS.*` pattern (POC)
- [ ] Global state uses Zustand store
- [ ] Path aliases used (`@/`) — no relative imports
- [ ] Tailwind classes only — no inline styles
- [ ] Light/dark theme supported via CSS variables
- [ ] shadcn primitives keep behavior/accessibility but visual classes match active `DESIGN.md`
- [ ] Header/sidebar/main shell regions do not overlap
- [ ] Any rendered page navigation comes from `src/config/menu/*`
- [ ] Loading and error states handled
- [ ] Route registered in `src/routes/`
- [ ] Menu entry added in `src/config/menu/` for every user-facing page, or the route is explicitly documented as hidden
- [ ] Env keys use `REACT_` prefix, ALL_CAPS, stored in `env/.env` and `env/.env.example`
- [ ] Env values consumed via `src/types/env.ts` — no raw `process.env.*` in components/services
- [ ] No new packages added without permission
- [ ] `src/components/ui/` behavior not rewritten; any variant edits are design-system alignment only
