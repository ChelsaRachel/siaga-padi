# Architecture — Rules & Constraints

## Folder Structure

### ✅ ALLOWED

| Location                   | Contents                                                   | Reason                                                               |
| -------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/pages/{page}/`        | Route-level component (thin, composition only)             | Separates routing logic from UI detail                               |
| `src/pages/{page}/parts/`  | Sub-components specific to that page                       | Prevents pollution into global folders                               |
| `src/pages/{page}/hooks/`  | Hooks specific to that page                                | Clear scope, does not leak to global                                 |
| `src/components/ui/`       | UI primitives/shared components (Button, Input, Modal)     | Reusable, not tied to any domain                                     |
| `src/components/layouts/`  | AppLayout, AppSidebar, AppHeader, AppFooter                | Centralized visual structure of the app                              |
| `src/components/domain/`   | Logic-heavy components (MapViewer, FlightMonitor)          | Complex components reusable across pages                             |
| `src/components/wrappers/` | HOC / Provider wrappers / third-party lib adapters         | Isolates external dependencies (Mapbox, ECharts)                     |
| `src/modules/`             | Reusable systems with own store + fetch + UI (2+ uses)     | Self-contained, not tied to one domain                               |
| `src/features/`            | Business domain folders (components, hooks, store, types)  | Domain-scoped code; each feature is isolated                         |
| `src/services/modules/`    | Resource-based service files                               | One file per resource, easy to locate                                |
| `src/hooks/`               | Global reusable custom hooks                               | Can be used across more than one page                                |
| `src/stores/`              | Zustand store files                                        | Centralized global state, not scattered                              |
| `src/types/`               | TypeScript global types & interfaces                       | Single source of truth for data types                                |
| `src/utils/`               | Pure functions (helpers, formatters)                       | No side effects, easy to test                                        |
| `src/schemas/`             | Global validation schemas (Yup) used across multiple pages | Dedicated folder for validation logic, separate from types and utils |
| `src/config/`              | Constants, env config, theme config                        | Centralized configuration, easy to change                            |
| `src/styles/`              | Global CSS, theme, variables                               | Separation of concerns between style and logic                       |
| `src/routes/`              | Router, route config, guards                               | Centralized routing and route protection                             |
| `src/assets/`              | SVG icons, images imported in JS/TS                        | Assets that need to be processed by the bundler                      |
| `public/`                  | Favicon, manifest, robots.txt, PWA icons                   | Static assets, not processed by the bundler                          |

---

### ❌ NOT ALLOWED

| Rule                                                                           | Reason                                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| ❌ Creating components directly in `src/` without a folder                     | Makes the root `src/` messy and hard to navigate                                                                                                 |
| ❌ **Placing page-specific components anywhere inside `src/components/`**      | Page components belong in `src/pages/{page}/parts/` — NEVER pollute `src/components/` with feature-specific UI. This is a hard stop.             |
| ❌ **Creating a new subfolder inside `src/components/` for a feature or page** | `src/components/` is for truly global/shared UI only (`ui/`, `layout/`, `domain/`, `wrappers/`); a feature subfolder here makes bugs untraceable |
| ❌ Placing API/fetching logic inside page components                           | Violates separation of concerns; use `src/services/` instead                                                                                     |
| ❌ Placing global state inside component files                                 | Use `src/stores/`; global state must be centralized                                                                                              |
| ❌ Putting local types in `src/types/` if only used in one file                | Declare them inline or in the file that uses them                                                                                                |
| ❌ Creating new folders outside the existing structure without discussion      | Breaks consistency; new architecture must be agreed upon by the team                                                                             |
| ❌ Placing JS-imported images/icons in `public/`                               | Use `src/assets/`; files in `public/` are not optimized by the bundler                                                                           |
| ❌ Placing config files (env, constants) inside components/pages               | Use `src/config/`; configuration must be easy to find and change                                                                                 |
| ❌ Creating a hook in `src/hooks/` if it is only used by one page              | Place it in `src/pages/{page}/hooks/` so the scope is clear                                                                                      |
| ❌ Dumping all components into `src/components/ui/` without categorization     | Split by subfolder: `ui/`, `layout/`, `domain/`, `wrappers/`                                                                                     |
| ❌ Direct cross-imports between `pages/`                                       | Inter-page communication must go through stores/services, not direct imports                                                                     |
| ❌ Placing validation schemas (Yup) inside component or page files             | Use `src/schemas/` for global schemas or `src/pages/{page}/` for page-scoped ones; keeps validation logic reusable and testable                  |
| ❌ Placing validation schemas in `src/utils/` or `src/types/`                  | Schemas are not pure helpers nor type definitions; they belong in `src/schemas/`                                                                 |

---

## Naming Convention

### ✅ ALLOWED

| File Type        | Convention                                | Example                                 |
| ---------------- | ----------------------------------------- | --------------------------------------- |
| React Component  | `PascalCase`                              | `UserCard.tsx`, `FlightMonitor.tsx`     |
| Page component   | `PascalCase` + `Page` suffix              | `DashboardPage.tsx`, `LoginPage.tsx`    |
| Page folder      | `kebab-case`                              | `src/pages/dashboard/DashboardPage.tsx` |
| Custom Hook      | `camelCase` + `use` prefix                | `useUserList.ts`, `useMapFilter.ts`     |
| Service file     | `camelCase` + `.service.ts` suffix        | `auth.service.ts`, `flight.service.ts`  |
| Store file       | `camelCase` + `use` prefix + `.ts` suffix | `useUserStore.ts`, `useAppStore.ts`     |
| Type / Interface | `PascalCase` + `T` or `I` prefix          | `TUser`, `IApiResponse`, `TFlightData`  |
| Utility function | `camelCase`                               | `formatDate.ts`, `mapHelpers.ts`        |
| Constants / Enum | `UPPER_SNAKE_CASE`                        | `MAX_RETRY_COUNT`, `API_BASE_URL`       |
| CSS / Style file | `kebab-case`                              | `theme.css`, `variables.css`            |
| Config file      | `kebab-case` + `-config` suffix           | `theme-config.ts`, `env.ts`             |
| Route file       | `kebab-case` + `.routes.tsx` suffix       | `main.routes.tsx`, `auth.routes.tsx`    |
| Schema file      | `camelCase` + `.schema.ts` suffix         | `user.schema.ts`, `auth.schema.ts`      |

---

### ❌ NOT ALLOWED

| Rule                                                                        | Reason                                                                      |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| ❌ Component name in `kebab-case` → `user-card.tsx`                         | React convention requires `PascalCase` for components                       |
| ❌ Page file without `Page` suffix → `dashboard/index.tsx`, `Dashboard.tsx` | Page components must use `PascalCase` + `Page` suffix → `DashboardPage.tsx` |
| ❌ Hook without `use` prefix → `userList.ts`                                | React does not recognize it as a hook; rules of hooks do not apply          |
| ❌ Ambiguous file name → `index.ts` inside `src/services/`                  | Hard to navigate; use a descriptive name per resource                       |
| ❌ Type/Interface without prefix → `User`, `Response`                       | Easily conflicts with variable names; `T`/`I` prefix clarifies the context  |
| ❌ Constants in `camelCase` → `maxRetryCount`                               | Constants must be `UPPER_SNAKE_CASE` to be clearly identifiable             |
| ❌ Store without a clear suffix → `user.ts`                                 | Unclear whether it is a store, service, or type; use naming conventions     |
| ❌ One file holding multiple different components → `components.tsx`        | One file = one responsibility (Single Responsibility Principle)             |
| ❌ File names using uncommon abbreviations → `usrMgmt.ts`                   | Hard to read and understand for other team members                          |
| ❌ Mixing languages in file names (e.g. local + English)                    | Choose one language (English recommended) for global consistency            |
| ❌ Spaces or special characters in file names → `User Card.tsx`             | Causes errors on imports and certain file systems                           |

---

## TypeScript Strict Typing

> All TypeScript code in this project **must use strict typing**. The use of `any` is considered a code smell and will be rejected during code review.

### ✅ ALLOWED

| Pattern                                                         | Example                                                                      | Reason                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Explicit type on every variable, parameter, and function return | `function getUser(id: string): TUser`                                        | Clear contract between functions and their consumers                   |
| Use `unknown` when the type is not yet known, then narrow       | `const data: unknown = await fetch(); if (typeof data === 'string') { ... }` | Type-safe, forces validation before use                                |
| Use `never` for exhaustive checks on union types                | `default: throw new Error(value satisfies never)`                            | Ensures all cases are handled when new types are added                 |
| Use `Partial<T>`, `Pick<T>`, `Omit<T>` for derived types        | `type TUserPreview = Pick<TUser, 'id' \| 'name'>`                            | Reuse types without duplication, stays strict                          |
| Use Generic `<T>` for flexible functions/components             | `function useList<T>(data: T[]): { items: T[] }`                             | Flexible without sacrificing type safety                               |
| Define API response types explicitly in `src/types/api.d.ts`    | `interface IApiResponse<T> { data: T; status: number }`                      | Consistent across all services, easy to change in one place            |
| Use `as const` for objects/arrays that never change             | `const ROLES = ['admin', 'user'] as const`                                   | TypeScript infers literal types instead of `string[]`                  |
| Enable `strict: true` in `tsconfig.json`                        | —                                                                            | Activates all strict checks: `noImplicitAny`, `strictNullChecks`, etc. |

---

### ❌ NOT ALLOWED

| Rule                                                                 | Correct Alternative                                               | Reason                                                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ❌ `any` as a variable or parameter type → `const data: any`         | Use an explicit type or `unknown`                                 | `any` disables all type checking; bugs go undetected at compile time             |
| ❌ `any` as a function return type → `function getData(): any`       | Define the return type explicitly                                 | Consumers of the function have no idea what is returned; prone to runtime errors |
| ❌ Arbitrary type assertion → `const user = data as TUser`           | Use a type guard or validation library (e.g. Yup)                 | Assertion without validation just moves the problem to runtime                   |
| ❌ `@ts-ignore` or `@ts-expect-error` without an explanation comment | Fix the incorrect type, or add a mandatory comment explaining why | Hides errors; other developers won't know why it was suppressed                  |
| ❌ `object` as a generic type → `const config: object`               | Use `Record<string, unknown>` or a specific interface             | `object` gives no information about the shape at all                             |
| ❌ `Function` as a type → `const cb: Function`                       | Use an explicit signature: `(id: string) => void`                 | `Function` is not type-safe; parameters and return type are unknown              |
| ❌ Optional fields without reason → `name?: string` on every field   | Make fields required if they are always present                   | Optional fields spread `undefined` checks throughout the codebase                |
| ❌ Arbitrary non-null assertion → `user!.profile.name`               | Perform a null check first                                        | If `user` is null at runtime, the app crashes without a clear message            |

---

### Practical Examples

```typescript
// ❌ BAD — using any
async function fetchUser(id: any): Promise<any> {
  const res = await api.get(`/users/${id}`);
  return res.data;
}

// ✅ GOOD — strict typing
async function fetchUser(id: string): Promise<TUser> {
  const res = await api.get<IApiResponse<TUser>>(`/users/${id}`);
  return res.data.data;
}
```

```typescript
// ❌ BAD — using unknown directly without narrowing
function processInput(input: unknown) {
  console.log(input.name); // Error: Object is of type 'unknown'
}

// ✅ GOOD — narrowing before access
function processInput(input: unknown) {
  if (typeof input === "object" && input !== null && "name" in input) {
    console.log((input as { name: string }).name);
  }
}
```

```typescript
// ❌ BAD — type assertion without validation
const user = JSON.parse(rawData) as TUser;

// ✅ GOOD — validate with a library like Yup
import * as yup from "yup";

const UserSchema = yup.object({
  id: yup.string().required(),
  name: yup.string().required(),
});

const raw: unknown = JSON.parse(rawData);

const user: TUser = await UserSchema.validate(raw);
```

---

## Additional Notes

- **Path alias `@/*`** → Always use the `@/` alias for absolute imports instead of deep relative paths (`../../../`). Configuration lives in `tsconfig.json`.
- **Barrel file (`index.ts`)** → May be used inside component or hook folders to simplify imports, but avoid it in `pages/` to prevent circular dependencies.
- **Co-location** → If a hook, type, or component is only used by one page, place it inside that page's folder (`pages/{page}/hooks/`, `pages/{page}/parts/`). Move it to global only when it is used in more than one place.
- **Route guards** → All route protection (auth, role) must live in `src/routes/guards/`, not inline inside page components.
- **Schema co-location** → If a schema is only used by a single page (e.g. a form specific to that page), place it alongside that page: `src/pages/{page}/user.schema.ts`. Move it to `src/schemas/` only when it is shared across multiple pages.

---

## Module vs Feature vs Component

|                              | `components/` | `modules/` | `features/` |
| ---------------------------- | ------------- | ---------- | ----------- |
| Has own Zustand store        | ❌            | ✅         | ✅          |
| Has own fetch logic          | ❌            | ✅         | ✅          |
| Reusable across domains      | ✅            | ✅         | ❌          |
| Domain-specific              | ❌            | ❌         | ✅          |
| When to create               | Always needed | Used in 2+ places | Domain spans 2+ pages |

---

## Import Ordering

Imports inside every file must follow this order (enforced by convention):

1. React and React Router imports
2. Third-party library imports
3. Internal absolute imports (`@/...`)
4. Relative imports (`./...`)
5. Type-only imports last (`import type { ... }`)

---

## Pre-Submission Verification Checklist

> Run through this checklist on every file or feature before submitting a Pull Request. All items must be checked. Unchecked items will be flagged during code review.

### Folder Structure

- [ ] No files are placed directly in `src/` without a folder
- [ ] Reusable systems (own store + fetch + UI, used 2+ places) are in `src/modules/`, not in `src/components/`
- [ ] Domain-scoped code (components, hooks, store, types for one feature) is in `src/features/{name}/`
- [ ] **All page-specific components are in `src/pages/{page}/parts/` — NOT anywhere inside `src/components/`**
- [ ] **No new subfolders were created inside `src/components/` for feature or page-specific components**
- [ ] API/fetching logic is placed in `src/services/modules/`, not inside components or pages
- [ ] Global state is managed in `src/stores/`, not stored in component `useState`
- [ ] Local types (used in only one file) are declared inline, not placed in `src/types/`
- [ ] No new folders were created outside the agreed structure without team discussion
- [ ] Images/icons imported in JS/TS are placed in `src/assets/`, not in `public/`
- [ ] Config files (env, constants) are placed in `src/config/`, not inside components or pages
- [ ] Hooks used by only one page are placed in `src/pages/{page}/hooks/`, not in `src/hooks/`
- [ ] Components are split across `ui/`, `layout/`, `domain/`, and `wrappers/` subfolders — not all dumped in `ui/`
- [ ] No direct cross-imports exist between `pages/`; communication goes through stores or services
- [ ] Validation schemas are not placed inside component files, `utils/`, or `types/`
- [ ] Global schemas are in `src/schemas/`; page-scoped schemas are in `src/pages/{page}/`

### Naming Convention

- [ ] All React components use `PascalCase` → `UserCard.tsx`
- [ ] All page components use `PascalCase` + `Page` suffix → `DashboardPage.tsx`, `LoginPage.tsx`
- [ ] All custom hooks have the `use` prefix → `useUserList.ts`
- [ ] All service files use the `.service.ts` suffix → `auth.service.ts`
- [ ] All store files use the `use` prefix and `.ts` suffix → `useUserStore.ts`
- [ ] All types and interfaces use `T` or `I` prefix → `TUser`, `IApiResponse`
- [ ] All constants and enums use `UPPER_SNAKE_CASE` → `MAX_RETRY_COUNT`
- [ ] All CSS/style files use `kebab-case` → `theme.css`
- [ ] All config files use `kebab-case` with `-config` suffix → `theme-config.ts`
- [ ] All route files use the `.routes.tsx` suffix → `main.routes.tsx`
- [ ] All schema files use the `.schema.ts` suffix → `user.schema.ts`
- [ ] No file uses uncommon abbreviations, spaces, or special characters
- [ ] No mixing of languages in file names; English is used consistently

### TypeScript Strict Typing

- [ ] `strict: true` is enabled in `tsconfig.json`
- [ ] No `any` is used anywhere — not in variables, parameters, or return types
- [ ] `unknown` is used instead of `any` for values with an unknown type, followed by type narrowing
- [ ] No arbitrary type assertions (`as SomeType`) without a type guard or validation
- [ ] No `@ts-ignore` or `@ts-expect-error` without a mandatory explanatory comment
- [ ] No `object` or `Function` used as generic types; explicit shapes and signatures are used instead
- [ ] Optional fields (`?`) are only used when the field is genuinely optional, not as a default
- [ ] No non-null assertions (`!`) without a preceding null check
- [ ] All API response types are explicitly defined in `src/types/api.d.ts`
- [ ] `as const` is applied to all constant objects and arrays that never change
- [ ] Utility types (`Partial<T>`, `Pick<T>`, `Omit<T>`) are used for derived types instead of duplicating interfaces
