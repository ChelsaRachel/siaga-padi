---
name: architecture
description: Enforce mandatory folder structure, file placement, and naming conventions. Use before creating any file or component. Single source of truth for where every file goes and what it is called.
---

# Folder Structure & Naming Convention Skill

Before creating or moving any file, consult this skill to determine the correct location and name. Never guess — the rules are explicit.

## Step 1 — Determine the file type

Ask: what kind of file is this?

| File Type                           | Go To                     |
| ----------------------------------- | ------------------------- |
| React component (reusable, shared)  | [Components](#components) |
| React component (page-level, route) | [Pages](#pages)           |
| Custom hook (global)                | [Hooks](#hooks)           |
| Custom hook (page-scoped)           | [Pages](#pages)           |
| API service / fetcher               | [Services](#services)     |
| Zustand store                       | [Stores](#stores)         |
| TypeScript type or interface        | [Types](#types)           |
| Validation schema (Yup/Zod)         | [Schemas](#schemas)       |
| Pure utility / helper function      | [Utils](#utils)           |
| Constants, enums, env config        | [Config](#config)         |
| CSS, theme, variables               | [Styles](#styles)         |
| Route definition, guard             | [Routes](#routes)         |
| Static asset (favicon, PWA icon)    | `public/`                 |
| Image/SVG imported in JS/TS         | `src/assets/`             |

---

## Components

Subfolder is determined by complexity and purpose:

| Subfolder                  | Use for                                                       | Example              |
| -------------------------- | ------------------------------------------------------------- | -------------------- |
| `src/components/ui/`       | **Base primitives (design-system binding)** — shadcn/Radix building blocks only; **all** elements here must visually follow the **active** `design/[platform]/[theme]/DESIGN.md` (variants, default classes, tokens). Edit these files whenever the design system switches; do not ship defaults that belong to another theme. | `Button.tsx`      |
| `src/components/common/`   | Shared pieces — reusable cross-feature, composed from `ui/`, no domain logic | `SearchBar.tsx` |
| `src/components/layouts/`  | App shell structure (AppLayout, AppSidebar, AppHeader, AppFooter) | `AppLayout.tsx`  |
| `src/components/wrappers/` | Provider wrappers + **`PerfectScrollArea`** (bounded scroll — mandatory themed scrollbar) | `MapboxWrapper.tsx`, `PerfectScrollArea.tsx` |

**Import direction (one-way only):** `pages → modules → common → ui`

> **MANDATORY before any component work:** check `src/components/ui/` for existing primitives first. Reuse if found. Create new UI primitive at `src/components/ui/{ComponentName}.tsx` if missing — named export, `className?: string` prop, no business logic.

### ⚠️ Domain components do NOT go in `src/components/`

`src/components/` is for **generic, domain-agnostic** code only. Any component that carries business domain meaning must go elsewhere:

| Component type | Correct location |
|----------------|-----------------|
| Panel content, data widgets, status indicators for a specific domain | `src/features/{domain}/{feature}/components/` |
| Component used only by a single page | `src/pages/{page}/parts/` |
| Generic system reused by 2+ features | `src/modules/{name}/` |

**Examples of violations** (do not do this):
- `src/components/sidebar/ActiveOperations.tsx` ← domain content, belongs in `features/tactical/sidebar/components/`
- `src/components/analytics/ThreatScoreGauge.tsx` ← domain content, belongs in `features/tactical/analytics/components/`
- `src/components/console/EventConsole.tsx` ← domain content, belongs in `features/tactical/console/components/`

**Before creating any domain component**, read [features/SKILL.md](../features/SKILL.md) to pick the correct domain bucket.

**Naming:** `PascalCase` → `UserCard.tsx`, `FlightMonitor.tsx`
**Rule:** One component per file. No exceptions.

---

## Pages

Each page lives in its own folder under `src/pages/`:

```
src/pages/dashboard/
├── DashboardPage.tsx  ← route entry (thin, composition only) — PascalCase + Page suffix
├── hooks/             ← hooks used only by this page
│   └── useDashboardData.ts
└── parts/             ← sub-components used only by this page
    └── StatsPanel.tsx
```

**Naming:** folder is `kebab-case`, page file is `PascalCase` + `Page` suffix → `DashboardPage.tsx`, `LoginPage.tsx`
**Rule:** Pages must be thin — no API logic, no business logic inline. Compose from hooks and components.
**Rule:** Hooks and components inside `pages/{page}/` must NOT be imported by other pages. Use stores or services for cross-page communication.
**Rule:** Never use `index.tsx` as the page entry file — the file must always be named with the `Page` suffix.

---

## Hooks

| Scope               | Location                  | Naming                  |
| ------------------- | ------------------------- | ----------------------- |
| Used by 1 page only | `src/pages/{page}/hooks/` | `useDashboardFilter.ts` |
| Used by 2+ pages    | `src/hooks/`              | `useUserList.ts`        |

**Naming:** `camelCase` + mandatory `use` prefix → `useMapFilter.ts`
**Rule:** Never create a hook in `src/hooks/` if it is only used in one place. Keep it co-located.

---

## Services

```
src/services/
├── api-client.ts          ← Axios instance + interceptors (do not add service logic here)
└── modules/
    ├── auth.service.ts
    ├── user.service.ts
    └── flight.service.ts
```

**Naming:** `camelCase` + `.service.ts` suffix → `auth.service.ts`
**Rule:** One service file per resource. Never put fetching logic inside components or pages.

---

## Stores

```
src/stores/
├── useUserStore.ts
└── useAppStore.ts
```

**Naming:** `camelCase` + `use` prefix + `.ts` suffix → `useUserStore.ts`
**Rule:** Global state only. Local UI state stays in the component via `useState`.

---

## Types

```
src/types/
├── api.d.ts        ← IApiResponse<T>, IApiError, request/response interfaces
├── models.d.ts     ← Entity types: TUser, TProject, TFlight
└── theme.d.ts      ← Theme/config type extensions
```

**Naming:** `PascalCase` + `T` prefix for types, `I` prefix for interfaces → `TUser`, `IApiResponse`
**Rule:** Only global types here. If a type is used in one file only, declare it in that file.

---

## Schemas

| Scope                       | Location                            |
| --------------------------- | ----------------------------------- |
| Used by 1 page only         | `src/pages/{page}/{name}.schema.ts` |
| Used by 2+ pages / globally | `src/schemas/{name}.schema.ts`      |

**Naming:** `camelCase` + `.schema.ts` suffix → `user.schema.ts`, `auth.schema.ts`
**Rule:** Never place schemas in `utils/`, `types/`, or inside component files.

---

## Utils

```
src/utils/
├── cn.ts               ← Tailwind merge + clsx helper
├── date-formatter.ts
└── map-helpers.ts
```

**Naming:** `camelCase` → `formatDate.ts`, `mapHelpers.ts`
**Rule:** Pure functions only. No side effects, no API calls, no state.

---

## Config

```
src/config/
├── constants.ts        ← Static data, enums, UPPER_SNAKE_CASE values
├── env.ts              ← Type-safe env variables
└── theme-config.ts     ← Color tokens for JS-based charting (ECharts etc.)
```

**Naming:** `kebab-case` + optional `-config` suffix → `theme-config.ts`, `env.ts`
**Naming (values):** `UPPER_SNAKE_CASE` → `MAX_RETRY_COUNT`, `API_BASE_URL`

---

## Styles

```
src/styles/
├── theme.css       ← @theme Tailwind 4 tokens (colors, fonts)
├── variables.css   ← CSS custom properties (:root)
└── components.css  ← Component-level CSS overrides
```

**Naming:** `kebab-case` → `theme.css`, `variables.css`

---

## Routes

```
src/routes/
├── index.tsx               ← Master RouterProvider
├── main.routes.tsx
├── admin.routes.tsx
├── auth.routes.tsx
└── guards/
    ├── AuthGuard.tsx
    └── RoleGuard.tsx
```

**Naming:** `kebab-case` + `.routes.tsx` suffix → `main.routes.tsx`
**Rule:** All route guards live here. Never implement auth/role checks inline in a page component.

---

## Quick Naming Reference

| Type            | Convention                   | Example                              |
| --------------- | ---------------------------- | ------------------------------------ |
| React Component | `PascalCase`                 | `UserCard.tsx`                       |
| Page Component  | `PascalCase` + `Page` suffix | `DashboardPage.tsx`, `LoginPage.tsx` |
| Custom Hook     | `use` + `camelCase`          | `useUserList.ts`                     |
| Service         | `camelCase` + `.service.ts`  | `auth.service.ts`                    |
| Store           | `use` + `camelCase` + `.ts`  | `useUserStore.ts`                    |
| Type            | `T` + `PascalCase`           | `TUser`                              |
| Interface       | `I` + `PascalCase`           | `IApiResponse`                       |
| Schema          | `camelCase` + `.schema.ts`   | `user.schema.ts`                     |
| Route           | `kebab-case` + `.routes.tsx` | `main.routes.tsx`                    |
| Config          | `kebab-case` + `-config`     | `theme-config.ts`                    |
| Constant        | `UPPER_SNAKE_CASE`           | `MAX_RETRY_COUNT`                    |
| CSS file        | `kebab-case`                 | `theme.css`                          |

---

## Absolute Rules (never break these)

- ✅ Always use `@/` path alias for imports — never `../../../`
- ✅ One file = one responsibility (one component, one hook, one service)
- ❌ Never create files directly in `src/` without a subfolder
- ❌ Never cross-import between `pages/` — use stores or services
- ❌ Never put API logic in a component or page file
- ❌ Never create a new top-level folder without team agreement

> Detailed rules and validation checklist: [references/architecture-rules.md](references/architecture-rules.md)
