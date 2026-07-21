---
name: app-layout
description: Step-by-step guide to build the application layout shell from scratch. Covers AppLayout, AppHeader, shell components, route nesting with Outlet, menu config separation, and design-system alignment for shadcn-based Tactical templates.
---

# App Layout Skill (React / TypeScript)

---

## Design-System Prerequisite

Before writing layout code in `apps/`, read `design/design-system.md` and the active `design/[platform]/[theme]/DESIGN.md`.

For shadcn-based templates:

- Use shadcn/Radix only where it provides behavior/accessibility.
- Layout shell visuals must follow active `DESIGN.md`, not raw shadcn defaults.
- If the active design is Tactical, the shell contract is `h-12` topbar, `w-[220px]` sidebar, `bg-background-primary` canvas, and `bg-background-secondary border-border-primary` shell surfaces. If another design is active, use that design's shell contract instead.
- In the current Tactical shell, `AppHeader` may remain an operational/status bar. Primary page navigation is typically rendered in `AppSidebar` from `APP_MENU`.

## Layout Region Contract — No Header/Sidebar Overlap

The app shell must reserve separate layout regions for header, sidebar, and content. Never allow the header and sidebar to paint over the same viewport area.

When using shadcn Sidebar, remember that the desktop sidebar primitive renders its panel with `fixed inset-y-0` by default. If the active layout has a full-width topbar, the sidebar must be offset by the header height and its height must be reduced by the same amount.

Example when the active design is Tactical:

| Region | Contract |
| ------ | -------- |
| Header | Full-width top region: `h-12 shrink-0` |
| Sidebar | Starts below header: `top-12 h-[calc(100svh-3rem)] w-[220px]` |
| Main | Scrolls inside remaining region: `flex-1 overflow-auto p-6` |
| Root | `flex h-screen flex-col overflow-hidden` |

Forbidden shell patterns:

```tsx
// ❌ Header only inside the content column while shadcn Sidebar is fixed at inset-y-0.
// This makes the sidebar occupy the header's vertical area.
<div className="flex h-screen">
  <AppSidebar />
  <div className="flex flex-col">
    <AppHeader />
    <main />
  </div>
</div>

// ❌ Sidebar fixed from top of viewport without top offset when a topbar exists.
<Sidebar className="fixed inset-y-0" />
```

Preferred full-width topbar topology:

```tsx
<SidebarProvider>
  <div className="flex h-screen w-full flex-col overflow-hidden bg-background-primary text-font-primary">
    <AppHeader />
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  </div>
</SidebarProvider>
```

**Scrolling:** `main`, sidebar body, drawers, and panels **must** use **`PerfectScrollArea`** (mandatory — **`skills/reactjs-responsive/SKILL.md`** § *Scrollable regions*). Global rails/thumbs use design tokens in **`styles/components.css`**. Keep bounded height (`flex-1 min-h-0` on the chain).

## Step 1 — Create menu config files

### `src/config/menu/app.menu.ts`

Top-level nav tabs visible to all authenticated users.

```ts
import type { IMenu } from "@/types/menu";

export const APP_MENU: IMenu[] = [
  {
    id: "xxxxx", // unique 5-7 char — check SKILL.md menu-config for existing IDs
    idParent: "",
    display: "Dashboard",
    name: "dashboard",
    path: "/",
    show: true,
    search: true,
    enabled: true,
    group: "data",
    type: "menu",
    icon: "gauge", // Phosphor icon slug
    seo: { title: "Dashboard", description: "" },
    additional: {
      container: "full",
      iconType: "phosphor",
      iconStyle: "regular",
      iconStyleActive: "fill",
      mainPage: true,
      redirectToEnabled: false,
      redirectTo: "",
    },
    privileges: [
      { label: "View", value: "view", description: "", type: "administrator" },
    ],
  },
];
```

### `src/config/menu/administrator.menu.ts`

Admin panel menus — role-gated, rendered in admin sidebar only.

```ts
import type { IMenu } from "@/types/menu";

export const ADMINISTRATOR_MENU: IMenu[] = [
  // add admin menus here
];
```

### `src/config/menu/index.ts`

```ts
export { APP_MENU } from "./app.menu";
export { ADMINISTRATOR_MENU } from "./administrator.menu";

import { APP_MENU } from "./app.menu";
import { ADMINISTRATOR_MENU } from "./administrator.menu";

export const ALL_MENUS = () => [...APP_MENU, ...ADMINISTRATOR_MENU];
```

---

## Step 2 — Create AppHeader

The header content is dynamic — adjust according to project needs. Minimum required components:

```tsx
// src/components/layouts/AppHeader.tsx
import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { APP_MENU } from "@/config/menu/app.menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const visibleNav = APP_MENU.filter((item) => item.show && item.enabled);

  return (
    <header className="flex h-12 shrink-0 select-none items-center gap-4 border-b border-border-primary bg-background-secondary px-4">
      <SidebarTrigger className="rounded-none text-font-secondary hover:text-font-primary" />

      {/* Nav tabs — driven by APP_MENU */}
      <nav className="flex items-center gap-1">
        {visibleNav.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 rounded-none px-3 py-1.5 text-p12 font-semibold uppercase tracking-[0.08em] transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-500"
                  : "text-font-secondary hover:bg-border-primary hover:text-font-primary",
              )
            }
          >
            {item.display}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Right slot — add brand, clock, status, actions as needed */}
    </header>
  );
}
```

**Optional additions** — add according to project needs:

| Element        | Hook / util                                                   |
| -------------- | ------------------------------------------------------------- |
| Live clock     | `useClock()` — `setInterval` 1s, cleared on unmount           |
| Online status  | `useOnlineStatus()` — `navigator.onLine` + event listeners    |
| Brand / logo   | Hardcoded in AppHeader — not driven by config                 |
| Action buttons | Inline — gunakan Phosphor icon `<i className="ph ph-{name}">` |

---

## Step 3 — Create AppLayout

```tsx
// src/components/layouts/AppLayout.tsx
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layouts/AppHeader";
import { AppSidebar } from "@/components/layouts/AppSidebar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background-primary text-font-primary">
        <AppHeader />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
```

---

## Step 4 — Wire routes with Outlet

```tsx
// src/routes/main.routes.tsx
import AppLayout from "@/components/layouts/AppLayout";
import AuthGuard from "./guards/AuthGuard";
import { lazy } from "react";

const Dashboard = lazy(() => import("@/pages/dashboard/index"));

const mainRoutes = [
  {
    path: "/",
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      // add more children here — they render inside <Outlet />
    ],
  },
];

export default mainRoutes;
```

---

## Adding a New Page

1. Create `src/pages/{page-name}/PageNamePage.tsx`
2. Add child route in `main.routes.tsx`
3. Add entry to `APP_MENU` in `app.menu.ts` (follow `menu-config` rules for unique ID) unless the task explicitly says the route is hidden/non-navigable
4. The page automatically appears in the navigation surface that reads `APP_MENU` and renders inside `<Outlet />`

---

## Adding an Admin Page

1. Create page at `src/pages/administrator/{page-name}/PageNamePage.tsx`
2. Add child route under the admin route group in `admin.routes.tsx` with `<RoleGuard allowedRoles={['admin']}>`
3. Add entry to `ADMINISTRATOR_MENU` in `administrator.menu.ts` unless the task explicitly says the route is hidden/non-navigable

## Hidden Route Exception

Skip menu wiring only when the prompt/task explicitly says the route is one of:

- hidden/internal
- callback-only
- redirect-only
- modal-only
- utility route with no direct navigation entry

If the task is silent on this, assume the page should be reachable from navigation and wire the matching menu entry.

---

## Rules & Constraints

### File Locations

- Layout components live in `src/components/layouts/` — never in `src/pages/`, `src/components/ui/`, or `src/layouts/`
- One `AppLayout.tsx` per application — never duplicate
- Layout files do not import page-level components

### Route Structure — Layout via Outlet

All authenticated routes MUST be nested under `AppLayout` using React Router `<Outlet />`.

#### ❌ Wrong

```tsx
// ❌ Each route renders its own layout — no shared shell
{ path: '/', element: <AuthGuard><Dashboard /></AuthGuard> }
{ path: '/prediksi-risiko', element: <AuthGuard><PrediksiRisiko /></AuthGuard> }
```

### AppLayout Rules

- `<Outlet />` is the ONLY place page content renders — never hardcode page content in AppLayout
- Header, sidebar, and main content must occupy separate regions; do not let fixed sidebar start under a full-width header.
- If shadcn Sidebar is fixed and the layout has a full-width header, apply a top offset equal to header height on desktop sidebar (`top-12` for Tactical).
- Sidebar state should come from shadcn `SidebarProvider` when using shadcn Sidebar; do not duplicate competing sidebar state in a global store.
- Navigation items must come from `src/config/menu/*`; do not define hardcoded menu arrays in `AppLayout`, `AppHeader`, or `AppSidebar`.
- Do not leave a new user-facing page unreachable: route wiring and menu wiring belong to the same implementation unit unless the route is explicitly hidden.

### AppHeader Rules

| Element              | Rule                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| Hamburger            | Uses shadcn `SidebarTrigger` inside `SidebarProvider`; no duplicated local/global sidebar state |
| Brand (logo + title) | Hardcoded in AppHeader — not driven by config                                      |
| Nav tabs             | Driven by `APP_MENU` from `src/config/menu/app.menu.ts` — filter `show && enabled` |
| Clock                | Local `useClock()` hook — `setInterval` 1s, cleared on unmount                     |
| Online status        | Local `useOnlineStatus()` hook — `navigator.onLine` + event listeners              |
| Shell icons          | Phosphor Web CSS only — `<i className="ph ph-{name}">` — no React icon imports     |

**Forbidden in AppHeader:**

- ❌ Page-specific data fetching
- ❌ Direct route navigation (use `<NavLink>`, not `useNavigate`)
- ❌ Importing from `lucide-react` or any React icon package
- ❌ Hardcoded menu items — always read from `APP_MENU`
- ❌ Local arrays like `const menuItems = [...]` in layout/sidebar/header components

### Menu Config Separation

| File                    | Contains                                 | Used By                           |
| ----------------------- | ---------------------------------------- | --------------------------------- |
| `app.menu.ts`           | `APP_MENU` — top-level nav tabs          | `AppHeader` nav loop              |
| `administrator.menu.ts` | `ADMINISTRATOR_MENU` — admin panel items | Admin sidebar                     |
| `index.ts`              | `ALL_MENUS()` — spreads both             | Permission checker, global search |

- Never import `ADMINISTRATOR_MENU` in `AppHeader`
- Never import `APP_MENU` in admin sidebar components
- Always import from `@/config/menu/app.menu` (specific) or `@/config/menu` (via index)

### Shell vs Page Components

| Characteristic                    | Layout (`components/layouts/`) | Page (`pages/{name}/`) |
| --------------------------------- | --------------------------- | ---------------------- |
| Renders once per session          | ✅                          | ❌                     |
| Can access global auth state      | ✅                          | ✅                     |
| Can fetch page-specific data      | ❌                          | ✅                     |
| Receives data props from pages    | ❌                          | —                      |
| Mounted/unmounted on route change | ❌                          | ✅                     |

---

## Pre-Submission Checklist

- [ ] All authenticated routes nested under `AppLayout` with `<Outlet />`
- [ ] Header, sidebar, and main content are separate non-overlapping regions
- [ ] shadcn fixed sidebar is offset by header height when a full-width topbar exists
- [ ] Sidebar width in the primitive and shell classes matches active `DESIGN.md` (Tactical example: `220px`)
- [ ] `AppHeader` reads nav from `APP_MENU`, not hardcoded
- [ ] `AppSidebar` reads nav from `APP_MENU` or the correct menu config, not a local hardcoded array
- [ ] Shell icons use `<i className="ph ph-{name}">` — no lucide-react imports
- [ ] Sidebar state owned by `AppLayout`, not a global store
- [ ] No page content hardcoded inside `AppLayout`
- [ ] `app.menu.ts` and `administrator.menu.ts` are separate files with distinct exports
- [ ] `src/config/menu/index.ts` exports `ALL_MENUS()`
