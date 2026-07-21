---
name: reactjs-sidebar
description: Step-by-step guide to build and fix the app sidebar using shadcn/ui. Covers CSS variables, active state, trigger placement, active DESIGN.md token/variant overrides, and common sidebar bugs.
---

# Sidebar Skill (React / TypeScript)

> Step-by-step guide to build and fix the app sidebar using shadcn/ui.

---

## Core Rule

Use shadcn Sidebar for behavior/accessibility (`SidebarProvider`, collapse state, keyboard/focus behavior, `asChild`). Do not keep the default shadcn visual style if it conflicts with `design/[platform]/[theme]/DESIGN.md`.

**Scroll:** `<SidebarContent>` (and any long nav/list inside the sidebar) **must** wrap overflow content in **`PerfectScrollArea`** — mandatory project standard; themed via `styles/components.css`. Supply `min-h-0 flex-1` on the flex chain. Details: **`skills/reactjs-responsive/SKILL.md`** § *Scrollable regions*.

### You may edit the shadcn sidebar module itself

Default radii, widths, rings, and muted colors come from **`src/components/ui/sidebar.tsx`** (generated shadcn code): `SIDEBAR_WIDTH`, `sidebarMenuButtonVariants`, `Sidebar` / `SidebarHeader` shell classes, etc. When switching design systems or aligning to a new `DESIGN.md`, **open this file and adjust those constants and `cva` variant strings** so they match the sidebar contract — not only `AppSidebar.tsx` and CSS variables. Preserve Radix behavior and `data-*` hooks; change presentation only.

The sidebar must render according to the active `DESIGN.md` sidebar contract. Example when the active design is Tactical:

- Container: `w-[220px] bg-background-secondary border-r border-border-primary`
- If the app has a full-width header: desktop sidebar starts below it, e.g. `top-12 h-[calc(100svh-3rem)]`
- Section label: `text-p12 uppercase tracking-[0.12em] text-font-placeholder`
- Active item: `bg-primary-50 text-primary-500 border-l-2 border-primary-500`
- Hover item: `hover:bg-border-primary hover:text-font-primary`

## Layout Offset Rule — Fixed Sidebar Must Not Cover Header

shadcn Sidebar's desktop implementation commonly uses a fixed panel (`fixed inset-y-0`). That is behaviorally fine, but it means the sidebar will occupy the full viewport height unless you override the panel position.

Before finalizing a sidebar in any app shell, identify the shell topology:

| Shell topology | Required sidebar behavior |
| -------------- | ------------------------- |
| Sidebar owns full viewport height and header is inside content only | Sidebar can use default `inset-y-0`; header does not span over sidebar |
| Header is full-width topbar above sidebar/content | Sidebar must be offset below header (`top-{header-height}`) and height reduced (`h-[calc(100svh-header-height)]`) |
| Mobile sidebar via sheet/drawer | Keep sheet behavior; offset is only needed for desktop fixed sidebar |

Example when the active design is Tactical and the topbar is `h-12`:

```tsx
<Sidebar className="top-12 h-[calc(100svh-3rem)] w-[220px] border-r border-border-primary bg-background-secondary">
  {/* content */}
</Sidebar>
```

Also make the shadcn primitive width match the active `DESIGN.md`. For Tactical, `SIDEBAR_WIDTH` in `src/components/ui/sidebar.tsx` must be `220px`, not the shadcn default `16rem`, otherwise the content gap and visual sidebar width will drift.

## Step 1 — Verify CSS Variables

Before anything else, confirm `src/styles/variables.css` has:

```css
:root {
  --sidebar: var(--bg-secondary);
  --sidebar-foreground: var(--font-primary);
  --sidebar-primary: var(--primary-base);
  --sidebar-primary-foreground: var(--font-on-accent);
  --sidebar-accent: var(--primary-light);
  --sidebar-accent-foreground: var(--primary-base);
  --sidebar-border: var(--border-primary);
  --sidebar-ring: var(--primary-soft);
}
.dark {
  /* same set with dark-mode token values */
}
```

And `src/styles/tailwind.css` `@theme inline` has all `--color-sidebar-*` aliases.

If missing → add them. Without these the sidebar renders transparent.

---

## Step 2 — Ensure `useIsMobile` Hook Exists

shadcn Sidebar requires `src/hooks/use-mobile.ts`:

```ts
import { useEffect, useState } from "react";
const MOBILE_BREAKPOINT = 768;
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}
```

---

## Step 3 — Build AppSidebar

```tsx
// src/components/layouts/AppSidebar.tsx
import { useLocation, NavLink } from "react-router-dom";
import { APP_MENU } from "@/config/menu/app.menu";
import { renderIcon } from "@/utils/icon-renderer";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

function NavItem({ item }) {
  const { pathname } = useLocation();
  const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
  const iconWeight = isActive ? item.additional?.iconStyleActive : item.additional?.iconStyle;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.display}
        className="rounded-none border-l-2 border-transparent text-font-secondary hover:bg-border-primary hover:text-font-primary data-[active=true]:border-primary-500 data-[active=true]:bg-primary-50 data-[active=true]:text-primary-500"
      >
        <NavLink to={item.path} className="flex items-center gap-3">
          {renderIcon({
            icon: item.icon,
            iconType: item.additional?.iconType,
            weight: iconWeight,
            className: "text-p14",
          })}
          <span>{item.display}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { open } = useSidebar();
  const visibleMenus = APP_MENU.filter((item) => item.show && item.enabled && item.idParent === "");

  return (
    <Sidebar
      collapsible="icon"
      className="top-12 h-[calc(100svh-3rem)] w-[220px] border-r border-border-primary bg-background-secondary"
    >
      <SidebarHeader className="border-b border-border-primary">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <i className="ph ph-shield-star text-h6 text-primary-500" aria-hidden="true" />
            {open && <span className="text-p14 font-semibold text-font-primary">Command</span>}
          </div>
          <SidebarTrigger className="size-7 rounded-none text-font-secondary hover:text-font-primary" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-p12 uppercase tracking-[0.12em] text-font-placeholder">
            Menu
          </SidebarGroupLabel>
          <SidebarMenu>
            {visibleMenus.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <NavItem href="/config" label="Settings" icon="gear-six" />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
```

---

## Step 4 — Wrap Layout in SidebarProvider

```tsx
// src/components/layout/AppLayout.tsx
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function AppLayout({ children, title }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title={title} />
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

## Common Fixes

### Fix: Active nav item not highlighted

- Cause: `isActive` not passed to `SidebarMenuButton`
- Fix: compute `isActive` from `useLocation().pathname` and pass as prop

### Fix: Logo/text overlaps trigger button

- Cause: `SidebarTrigger` outside sidebar, or `group-data-[collapsible=icon]:hidden` not working
- Fix: move trigger INSIDE `<SidebarHeader>`, use `{open && <span>text</span>}` for conditional text

### Fix: Sidebar transparent / no background

- Cause: `--sidebar-*` CSS variables undefined
- Fix: add to `variables.css` and `tailwind.css`, mapped to the active `DESIGN.md`

### Fix: Sidebar overlaps / covers header

- Cause: desktop shadcn Sidebar uses fixed positioning from `inset-y-0`, while the app also has a full-width topbar.
- Fix: make `AppLayout` a vertical shell (`AppHeader` first, then sidebar/main row), then offset the desktop sidebar by the header height.
- Tactical example: `AppLayout` root uses `flex h-screen flex-col`; `AppSidebar` uses `top-12 h-[calc(100svh-3rem)] w-[220px]`.
- Also verify `SIDEBAR_WIDTH` in `src/components/ui/sidebar.tsx` equals the active `DESIGN.md` sidebar width, otherwise the fixed panel and content spacer can mismatch.

### Fix: Invalid HTML warning (`<a>` inside `<button>`)

- Cause: `<NavLink>` wrapping `<SidebarMenuButton>` without `asChild`
- Fix: add `asChild` to `SidebarMenuButton` so it renders as the NavLink element

### Fix: Sidebar menu is hardcoded

- Cause: `AppSidebar` defines a local array like `const menuItems = [...]`.
- Fix: move the entries to `src/config/menu/app.menu.ts` and render `APP_MENU.filter((item) => item.show && item.enabled && item.idParent === '')`.
- Use `renderIcon()` with `item.icon`, `item.additional.iconType`, and active/inactive icon weights from `additional.iconStyleActive` / `additional.iconStyle`.
- Route registration still belongs in `src/routes/`; menu config only describes visible navigation metadata.

---

## Rules & Constraints

### Active Navigation State

**Key points:**

- Use `useLocation()` to compute `isActive` — do NOT rely on NavLink's render prop `isActive` when inside `SidebarMenuButton`
- Pass `isActive` to `SidebarMenuButton` as a prop — this applies the correct active styles
- Use `asChild` to render `SidebarMenuButton` as the NavLink element
- Source menu items from `APP_MENU` / relevant menu config; never hardcode navigation arrays in layout components

#### ❌ Wrong patterns

```tsx
// ❌ NavLink wraps SidebarMenuButton — invalid HTML (a > button)
<NavLink to={href}>
  <SidebarMenuButton>...</SidebarMenuButton>
</NavLink>;

// ❌ CSS group selector for active — unreliable with shadcn sidebar
className = "group-data-[active=true]:font-bold";
```

### Sidebar Trigger Placement

Default pattern: `SidebarTrigger` lives INSIDE the sidebar header.

If the product requires a global topbar trigger in `AppHeader`, this is allowed only when:

- `AppHeader` is rendered inside the same `SidebarProvider`
- `AppHeader` and `AppSidebar` occupy separate non-overlapping shell regions
- Desktop fixed sidebar is offset below the topbar when the topbar is full-width

```tsx
// ❌ Wrong — trigger in AppHeader causes logo/trigger overlap
<header>
  <SidebarTrigger />
  <span>Page Title</span>
</header>
```

### Collapsed State — Text Visibility

Use `useSidebar().open` (React state) to conditionally render text — **not** CSS group selectors.

```tsx
// ✅ Correct
const { open } = useSidebar();
{
  open && <span className="font-semibold">App Name</span>;
}

// ❌ Wrong — CSS selector unreliable when sidebar state changes
<span className="group-data-[collapsible=icon]:hidden">App Name</span>;
```

### Provider Requirement

Wrap the entire layout in `SidebarProvider`. `useSidebar()` throws if called outside.

### Config Menu Placement

Settings/config menu item belongs in `<SidebarFooter>`, separated from main nav.

### Active Design Visual Override

- Use shadcn Sidebar for state and accessibility.
- Override `Sidebar`, `SidebarMenuButton`, labels, and trigger with semantic classes from the active `DESIGN.md`.
- Do not import `lucide-react`; use Phosphor Web CSS icons (`<i className="ph ph-{name}" />`).
- Do not keep shadcn defaults like `rounded-md`, `bg-muted`, or `text-muted-foreground` if the active `DESIGN.md` defines a different sidebar style.

---

## Pre-Submission Checklist

- [ ] All `--sidebar-*` variables defined in `variables.css` `:root` AND `.dark`
- [ ] All `--color-sidebar-*` aliases in `tailwind.css` `@theme inline`
- [ ] Active nav item highlighted — uses `useLocation()` + `isActive` prop on `SidebarMenuButton`
- [ ] Sidebar navigation is rendered from `src/config/menu/*`, not from a hardcoded local array
- [ ] Tactical active/hover classes override default shadcn sidebar appearance
- [ ] No invalid HTML (`<a>` wrapping `<button>`) — use `asChild` pattern
- [ ] Header and sidebar do not overlap; fixed desktop sidebar has top offset if a full-width topbar exists
- [ ] shadcn `SIDEBAR_WIDTH` matches active `DESIGN.md` sidebar width
- [ ] `SidebarTrigger` is inside `<SidebarHeader>`, or if it is in `AppHeader`, the shell still has separated non-overlapping regions
- [ ] Collapsed text hidden via `useSidebar().open` React state (not CSS group selectors)
- [ ] `SidebarProvider` wraps the entire layout
- [ ] `src/hooks/use-mobile.ts` exists and exports `useIsMobile`
- [ ] Config/settings menu is in `<SidebarFooter>`
- [ ] Phosphor Web CSS icons are used; no React icon package imports
- [ ] Long sidebar nav / `<SidebarContent>` scroll uses **`PerfectScrollArea`** (token-themed scrollbars — see `skills/reactjs-responsive/SKILL.md`)
