---
name: reactjs-slicing-ui
description: End-to-end workflow for translating Figma designs into React components. Covers the active DESIGN.md token chain, shadcn/ui behavior-first primitives, active design token/variant overrides, project component hierarchy, styling, and token/composition conflict resolution.
---

## Skill: Slicing UI

### Overview

Slicing UI means converting a Figma design into React + Tailwind code while staying in sync with the active design system's token chain.

**First step — always:** read `design/design-system.md` to determine the active `platform` and `theme`, then resolve all file paths from the Platform Reference Map in that file.

The token chain for the active theme is:

```
design/design-system.md         ← resolve active platform + theme
    ↓
design/[platform]/[theme]/variable.css        ← CSS custom properties (--base-*, semantic vars)
    ↓
design/[platform]/[theme]/tailwind.css        ← Tailwind v4 @theme mapping
    ↓
Tailwind utility classes        ← classes defined by DESIGN.md (e.g. bg-primary-500, text-h4, p-4)
    ↓
React component JSX             ← className="…"
```

> Also read `design/[platform]/[theme]/DESIGN.md` for decision rules, forbidden patterns, and theme-specific behavior before writing any component.

Every visual value in a component must trace back to a token at the top of this chain. Hard-coded hex, px, or rem values are only acceptable when **no token covers the case** and the gap has been checked against `DESIGN.md`.

When the target app under `apps/` uses shadcn/ui, use shadcn for behavior/accessibility and make the visuals follow `DESIGN.md` through token wiring and variant/class overrides.

The component hierarchy follows the project folder contract:

| Level         | Folder                | Examples from Design System                                 |
| ------------- | --------------------- | ----------------------------------------------------------- |
| UI primitives | `components/ui/`      | Button, Input, Badge, Avatar, Checkbox, Switch, Tooltip     |
| Shared components | `components/common/`  | RadioGroup, Alert, Breadcrumb, Pagination, Stepper, Upload  |
| Feature modules | `modules/{feature}/`  | DataTable, Sidebar, Header, Dialog, Form, Calendar, Chart (ECharts-based) |
| Layout shells | `components/layouts/` | AppLayout, AppSidebar, AppHeader, AppFooter                 |
| Pages         | `pages/`              | Full route-level views assembled from modules + shared components |

**Import direction (one-way only):** `pages → modules → common → ui`

---

### When to Use

| Situation                                                               | Action                                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Implementing a new component from Figma                                 | Follow full token chain — `DESIGN.md` → CSS var → Tailwind class                        |
| Adding a style not covered by any Tailwind alias                        | Check `variable.css` (active theme) first; use the CSS var directly if it exists        |
| Working inside `apps/` and a color / spacing diverges from the template | Replace divergent value back to the CSS variable from the active theme's `variable.css` |
| shadcn component behavior is needed                                     | Use shadcn primitive, then override variant/classes to match `DESIGN.md`                |
| shadcn component is only being used as a static surface                  | Prefer plain JSX wrapper with `DESIGN.md` classes                                      |
| Choosing which folder to place a new component                          | Match the project component hierarchy from the table above                              |
| A design uses a color outside the defined palette                       | Map to the nearest semantic token; never add a raw hex                                  |
| Dark mode styling is needed                                             | Do not fork styles — rely on `.dark {}` overrides in `variables.css`                    |

---

### How to Use

#### Step 0b — Build Composition Map from `DESIGN.md` (CRITICAL)

Before slicing any section, extract a composition map from `DESIGN.md`:

- Card pattern
- Sidebar/drawer/panel pattern
- Table/list wrapper pattern
- Form/dialog wrapper pattern

Then map each Figma block to one of those patterns first, and only after that write JSX.

If a component cannot be mapped to a `DESIGN.md` pattern, stop and resolve token/pattern gap in styles first.

---

#### Step 1 — Resolve the Active Theme and Load Its Token Map

**Do this before writing a single line of JSX.**

1. Read `design/design-system.md` → get `platform` and `theme` (e.g. `web` / `tactical`)
2. Read `design/[platform]/[theme]/DESIGN.md` → this is the **authoritative token map** for the current session

`DESIGN.md` contains:

- Available palette groups (primary, secondary, neutral, orange, etc.)
- Semantic CSS variable names (`--bg-primary`, `--font-primary`, `--border-primary`, ...)
- Tailwind class aliases (`bg-background-primary`, `text-font-primary`, ...)
- Forbidden patterns (raw hex, arbitrary colors, which palettes don't exist)
- Default mode (dark-first or light-first)
- Typography scale aliases (`text-h1`, `text-p14`, etc.)

**Common conventions across many themes (examples only; DESIGN.md wins):**

| Property         | Tailwind class                    |
| ---------------- | --------------------------------- |
| Primary fill     | `bg-primary-500`                  |
| Error state      | `text-error-500` / `bg-error-500` |
| Success state    | `text-success-500`                |
| Warning state    | `text-warning-500`                |
| Card background  | `bg-card`                         |
| Spacing 4px      | `p-1` / `gap-1`                   |
| Spacing 8px      | `p-2` / `gap-2`                   |
| Spacing 16px     | `p-4` / `gap-4`                   |
| Spacing 24px     | `p-6` / `gap-6`                   |
| Border radius sm | `rounded-sm`                      |
| Surface radius | Read from active `DESIGN.md` |
| Pill             | `rounded-full`                    |
| Font semibold    | `font-semibold`                   |

> **For ALL theme-specific classes** (backgrounds, text colors, borders, brand palette):
> use the Tailwind class reference from `DESIGN.md`. Never invent class names.
> See the Appendix at the bottom of this file for Tactical and Fusion example token maps.

---

#### Step 1b — Token Gap Resolution (Before Writing Any Component)

> **Run this before Step 2.** If DESIGN.md defines tokens that don't exist in `variables.css` or `tailwind.css`, add them now — not inline in components.

**How to detect a gap:**
Cross-check every Tailwind class listed in `DESIGN.md`'s Decision Rules table against `apps/[app]/src/styles/tailwind.css`.
If a class is in DESIGN.md but has no `--color-*` entry in `tailwind.css` → it's a gap.

**How to fill a gap (additive-only — never remove existing variables):**

1. **Add to `variables.css`** — in the correct semantic section, with both `:root` (light) and `.dark` (dark) values:

```css
:root {
  --your-new-token: var(--base-neutral-200);
}
.dark {
  --your-new-token: var(--base-neutral-700);
}
```

2. **Add to `tailwind.css` `@theme inline {}`** — register the Tailwind class:

```css
--color-your-new-token: var(--your-new-token);
```

3. **Use in component via Tailwind class only** — never via `var()` in JSX:

```tsx
<div className="bg-your-new-token text-font-primary">...</div>
```

**shadcn/ui wiring gaps:**
If a shadcn component (Button, Card, Dialog, etc.) renders with wrong colors, the wiring variable is missing from `variables.css`.
Add it there — do NOT override in the component file:

```css
/* variables.css — fix shadcn wiring */
:root {
  --card: var(--bg-secondary);
  --card-foreground: var(--font-primary);
}
```

**Rule: DESIGN.md is the primary guide. The template is additive.**
Always follow DESIGN.md as the authority. If the template is missing something DESIGN.md defines → add it.
Never remove or reduce what's already in the template.

---

#### Step 1c — shadcn Primitive Strategy (MANDATORY for apps templates)

In shadcn-based apps, separate behavior from presentation:

1. Keep shadcn/Radix primitives for behavior-heavy UI:
   - `Button`, `Input`, `Select`, `Checkbox`, `Dialog`, `Popover`, `DropdownMenu`, `Tooltip`, `Form`, `Sidebar`
2. Override visual output through:
   - shadcn CSS variable wiring in `src/styles/variables.css`
   - Tailwind aliases in `src/styles/tailwind.css`
   - component variants/classes using semantic classes from `DESIGN.md`
3. Preserve accessibility and behavior:
   - keep `asChild`, refs, `aria-*`, `data-*`, controlled values, focus rings, portals, and keyboard behavior
4. Bypass shadcn only when the component has no meaningful behavior:
   - metric card
   - static dashboard panel
   - table/panel wrapper

If a shadcn component "does not follow" the design, fix the token/variant layer first. Do not rewrite the behavior unless the primitive cannot support the required interaction.

---

#### Step 1d — Edit shadcn base components when switching design systems (required capability)

After copying canonical `variable.css` / `tailwind.css` from `design/[platform]/[theme]/`, variables alone may not fully match `DESIGN.md` because shadcn primitives embed **default class strings and `cva` variants** inside `apps/[app]/src/components/ui/*.tsx`.

**You are explicitly allowed to modify those source files** so the installed primitive matches the active theme:

| Target | What to change |
| ------ | ---------------- |
| **Variant definitions** (`buttonVariants`, `sidebarMenuButtonVariants`, `input`, `badge`, etc.) | Replace shipped defaults (`rounded-md`, `bg-primary`, `text-muted-foreground`, …) with classes listed in the active `DESIGN.md` / token chain. |
| **Layout constants** | e.g. `SIDEBAR_WIDTH` in `sidebar.tsx` must equal the sidebar width in `DESIGN.md`; gap/spacer classes on `Sidebar`, `SidebarInset`, `SidebarContent` if the recipe differs. |
| **Slots / structural classNames** | Dialog/Sheet/Popover surfaces — ensure panel/header/footer recipes match card/panel patterns from `DESIGN.md`. |

**Order of operations:** (1) sync CSS from `design/` → app styles, (2) re-read `DESIGN.md`, (3) adjust `components/ui/*` defaults only for presentation (preserve Radix behavior, refs, `asChild`, `data-*`, a11y).

Do **not** fork primitives into duplicate files unless the upstream component cannot express the layout; prefer editing the existing shadcn file in place.

---

#### Step 2 — UI primitives (`components/ui/`)

UI primitives live in `components/ui/` and map to a single shadcn/ui Radix primitive when behavior/accessibility is useful. Style only with tokens and keep `className` last in `cn()` so page/module overrides can win.

**Before creating a new primitive — check first:**

```bash
ls src/components/ui/
```

If a similar primitive exists → reuse or extend via props/variants. Only create if none exists.

**File naming reference:**

| UI Element        | File Name         |
| ----------------- | ----------------- |
| Button            | `Button.tsx`      |
| Text input        | `Input.tsx`       |
| Textarea          | `Textarea.tsx`    |
| Checkbox          | `Checkbox.tsx`    |
| Radio             | `RadioButton.tsx` |
| Toggle/Switch     | `Switch.tsx`      |
| Badge/Tag         | `Badge.tsx`       |
| Avatar            | `Avatar.tsx`      |
| Icon              | `Icon.tsx`        |
| Spinner/Loader    | `Spinner.tsx`     |
| Tooltip           | `Tooltip.tsx`     |
| Separator/Divider | `Separator.tsx`   |
| Label             | `Label.tsx`       |
| Select/Dropdown   | `Select.tsx`      |

**Primitive template:**

```tsx
// components/ui/{ComponentName}.tsx
import { cn } from '@/utils/cn';

interface {ComponentName}Props {
  // define props here
  className?: string; // always allow className override
}

export const {ComponentName} = ({ className, ...props }: {ComponentName}Props) => {
  return (
    <element className={cn('base-token-classes', className)} {...props} />
  );
};
```

**Export checklist:**

- Named export (not default)
- `className?: string` prop accepted and forwarded via `cn()`
- shadcn variants and base `className` strings in `components/ui/*.tsx` are allowed to be edited when aligning to the active `DESIGN.md` (including after a theme switch)
- No business logic, no API calls, no state management
- No imports from `components/common/` or `modules/`

**Example:**

```tsx
// components/ui/status-badge.tsx
import { cn } from "@/utils/cn";

type Status = "success" | "error" | "warning" | "info";

const statusMap: Record<Status, string> = {
  success: "bg-success-50 text-success-500",
  error: "bg-error-50 text-error-500",
  warning: "bg-warning-50 text-warning-500",
  info: "bg-info-50 text-info-500",
};

interface StatusBadgeProps {
  status: Status;
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1",
        "text-p12 font-medium",
        statusMap[status],
        className,
      )}
    >
      {label}
    </span>
  );
}
```

---

#### Step 2.5 — Surface Composition Guardrail (MANDATORY)

For any component that creates a visual surface (card/panel/sidebar/dialog/table wrapper):

- Do NOT rely on raw/default shadcn appearance.
- Explicitly apply semantic composition classes from `DESIGN.md`.
- Validate: background + border + radius + shadow + spacing + text classes all match the pattern.
- Preserve shadcn behavior and accessibility props while changing classes.

Example Tactical card baseline (only when active `DESIGN.md` is Tactical):
`bg-background-secondary border border-border-primary rounded-none p-4`

Example Tactical metric card baseline (only when active `DESIGN.md` is Tactical):
`bg-background-secondary p-3 rounded-none shadow-none border-0`

Example Tactical sidebar/panel baseline (only when active `DESIGN.md` is Tactical):
`bg-background-secondary border border-border-primary rounded-none`

---

#### Step 3 — Shared Component

Shared components live in `components/common/` — reusable across the whole app, no domain logic, no API calls. Compose from UI primitives only and never import from `modules/`.

```tsx
// components/common/form-field-group.tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

interface FormFieldGroupProps {
  id: string;
  label: string;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function FormFieldGroup({
  id,
  label,
  placeholder,
  error,
  className,
}: FormFieldGroupProps) {
  return (
    <div className={cn("flex flex-col gap-1-5", className)}>
      <Label htmlFor={id} className="text-p14 font-medium text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        placeholder={placeholder}
        className={cn(error && "border-error-500 focus-visible:ring-error-500")}
      />
      {error && <p className="text-p12 text-error-500">{error}</p>}
    </div>
  );
}
```

---

#### Step 4 — Feature Module

Feature modules live in `modules/{feature}/` — feature-scoped, may hold their own store, state, and fetch logic. They compose shared components and UI primitives.

```tsx
// modules/product/ProductCard.tsx
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/utils/cn";

interface ProductCardProps {
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
  onAddToCart: () => void;
  className?: string;
}

export function ProductCard({
  name,
  price,
  stock,
  imageUrl,
  onAddToCart,
  className,
}: ProductCardProps) {
  const isLowStock = stock > 0 && stock <= 5;
  const isOutOfStock = stock === 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-none border border-border-primary bg-background-secondary p-4",
        className,
      )}
    >
      <img
        src={imageUrl}
        alt={name}
        className="aspect-square w-full rounded-none object-cover"
      />

      <div className="flex flex-col gap-1">
        <p className="text-p14 font-semibold text-foreground line-clamp-2">
          {name}
        </p>
        <p className="text-h6 font-bold text-primary-500">
          Rp {price.toLocaleString("id-ID")}
        </p>
      </div>

      {isLowStock && (
        <StatusBadge status="warning" label={`Only ${stock} left`} />
      )}
      {isOutOfStock && <StatusBadge status="error" label="Out of stock" />}

      <Button onClick={onAddToCart} disabled={isOutOfStock} className="w-full">
        Add to Cart
      </Button>
    </div>
  );
}
```

---

#### Step 5 — Layout Shell

Layout shells live in `components/layouts/` and define the app shell structure. They accept `React.ReactNode` props, not data props.

```tsx
// components/layouts/DashboardLayout.tsx
interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({
  sidebar,
  header,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card shrink-0">
        {sidebar}
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 shrink-0 border-b border-border bg-card flex items-center px-6">
          {header}
        </header>
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
```

> **Scrollbar UX (mandatory):** Every bounded scroll region (sidebar body, main column, panels, feeds, drawer content) **must** use **`PerfectScrollArea`** from `@/components/wrappers/PerfectScrollArea` — global `.ps__*` theming in `styles/components.css` follows design tokens. See **`skills/reactjs-responsive/SKILL.md`** § *Scrollable regions* for exceptions only.

---

#### Step 6 — Page

Pages live in `pages/` and own route-level composition. They assemble layout shells and feature modules, passing data down as props when needed.

```tsx
// pages/products/ProductListPage.tsx
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { AppSidebar } from "@/components/layouts/AppSidebar";
import { AppHeader } from "@/components/layouts/AppHeader";
import { ProductCard } from "@/modules/product/ProductCard";

export default function ProductListPage() {
  const products = useProducts(); // data fetching at page level only

  return (
    <DashboardLayout
      sidebar={<AppSidebar />}
      header={<AppHeader title="Products" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            name={p.name}
            price={p.price}
            stock={p.stock}
            imageUrl={p.imageUrl}
            onAddToCart={() => addToCart(p.id)}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}
```

---

#### Step 7 — Token Conflict Resolution (inside `apps/`)

When the template is scaffolded into `apps/`, the `variable.css` from the active theme (`design/[platform]/[theme]/variable.css`) is the **authoritative source**. Any value inside `apps/` that diverges from these variables must be replaced back to the correct CSS variable or Tailwind class.

**Detect conflicts — patterns to look for:**

```tsx
// ❌ hardcoded hex color
className="bg-[#0d5eba]"
style={{ color: '#5b5d63' }}

// ❌ hardcoded pixel value
className="p-[18px] text-[15px] rounded-[8px]"

// ❌ Tailwind arbitrary value that shadows a token
className="text-[14px]"     // token exists: text-p14
className="rounded-[8px]"   // replace with the radius class required by active DESIGN.md
className="gap-[16px]"      // token exists: gap-4
```

**Fix — replace with the token equivalent:**

```tsx
// ✅ semantic or palette token class
className="bg-primary-500"    // replaces bg-[#0d5eba]
className="text-neutral-600"  // replaces style={{ color: '#5b5d63' }}
className="p-4 text-p14 rounded-none gap-4"  // example if active DESIGN.md requires square surfaces

// ✅ CSS variable fallback when no Tailwind alias exists
style={{ boxShadow: '0 2px 8px 0 rgba(51,51,51,0.10)' }}  // shadow-sm token
```

**Token→class quick reference — TACTICAL theme:**

| What you found           | Replace with (Tactical)                             |
| ------------------------ | --------------------------------------------------- |
| `#2EB3E8` / `#1A96CC`    | `bg-primary-500` / `text-primary-500`               |
| `#7BAEE0`                | `bg-secondary-500`                                  |
| `#3DBE6C` / `#2ECC71`    | `bg-tertiary-500` / `text-tertiary-500`             |
| `#E03535` / `#BE2323`    | `bg-error-500` / `text-error-500`                   |
| `#1A8A4A` / `#2ECC71`    | `text-success-500` / `bg-success-500`               |
| `#D4A812` / `#F5C518`    | `text-warning-500` / `bg-warning-500`               |
| `#F28C28` / `#D47820`    | `bg-orange-500`                                     |
| `#06080C` / `#0D1117`    | `bg-background-primary` / `bg-background-secondary` |
| `#FFFFFF` (text on dark) | `text-font-primary`                                 |
| `#868B94` (muted text)   | `text-font-secondary`                               |
| `#171A1F` (border)       | `border-border-primary`                             |
| `14px` font              | `text-p14`                                          |
| `12px` font              | `text-p12`                                          |
| `16px` font              | `text-p16`                                          |
| `rounded-[4px]`          | Radius class required by active `DESIGN.md` |
| `rounded-[8px]`          | Radius class required by active `DESIGN.md` |
| `rounded-[12px]`         | Radius class required by active `DESIGN.md` |
| `p-[16px]` / `m-[16px]`  | `p-4` / `m-4`                                       |
| `gap-[8px]`              | `gap-2`                                             |
| `gap-[24px]`             | `gap-6`                                             |

**Token→class quick reference — FUSION theme:**

| What you found          | Replace with (Fusion)                  |
| ----------------------- | -------------------------------------- |
| `#0d5eba` / `#3d7ec8`   | `bg-primary-500` / `text-primary-500`  |
| `#ff6f00`               | `bg-secondary-500`                     |
| `#16a085`               | `bg-tertiary-500`                      |
| `#d12727`               | `text-error-500` / `bg-error-500`      |
| `#167c30`               | `text-success-500`                     |
| `#ffaf05`               | `text-warning-500`                     |
| `#c70039`               | `bg-quaternary-500`                    |
| `#8e44ad`               | `bg-quinary-500`                       |
| `#f5f7fa`               | `bg-background` / `bg-neutral-100`     |
| `#e6e9f0`               | `border-border` / `border-neutral-200` |
| `#050505` (text)        | `text-foreground`                      |
| `#7a7c81` (muted)       | `text-muted-foreground`                |
| `14px` font             | `text-p14`                             |
| `12px` font             | `text-p12`                             |
| `rounded-[4px]`         | `rounded-sm`                           |
| `rounded-[8px]`         | `rounded-lg`                           |
| `p-[16px]` / `m-[16px]` | `p-4` / `m-4`                          |

---

#### Step 8 — Composition Conflict Resolution (inside `apps/`) (CRITICAL)

Composition conflict = token names are valid, but component structure/style usage still diverges from `DESIGN.md`.

Common examples:

- Sidebar uses default primitive style without the active `DESIGN.md` panel composition
- Card uses correct text color but wrong surface/border/shadow/spacing recipe
- Dialog/table wrappers mix default shadcn look with partial token override

Resolution protocol:

1. Identify target pattern in `DESIGN.md` (card/panel/form/table)
2. Normalize base container classes to pattern
3. Re-check inner typography and state elements against decision rules
4. Keep shadcn behavior untouched; only align token wiring, variants, composition, and style

Do not mark slicing complete until composition conflicts are resolved.

---

## Styling Workflow

### Decision Tree

```
Need to style something?
  │
  ├─ Can Tailwind handle it? ──────── YES → Use Tailwind className
  │                                   NO ↓
  ├─ Is it complex/dynamic/CSS-only? ─ YES → Use styled-components
  │
  └─ Inline style? ───────────────── NEVER
```

### Tailwind Patterns

**Layout:**

```tsx
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-3 gap-6">
<div className="flex flex-col space-y-2">
```

**Conditional classes — always use `cn()`:**

```tsx
import { cn } from "@/utils/cn";

<button
  className={cn(
    "rounded-md px-4 py-2 text-sm font-medium transition-colors",
    isActive && "bg-primary text-primary-foreground",
    isDisabled && "cursor-not-allowed opacity-50",
    className,
  )}
/>;
```

Never concatenate class strings with template literals — use `cn()`.

**Responsive:**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
<p className="text-sm md:text-base lg:text-lg">
```

**Dark mode (via CSS variable tokens — auto-switch, no per-component override):**

```tsx
/* Tactical — uses semantic classes */
<div className="bg-background-primary text-font-primary border-border-primary">
<button className="bg-primary-500 text-font-on-accent hover:bg-primary-400">

/* Fusion — uses shadcn defaults */
<div className="bg-background text-foreground border-border">
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
```

> Never add `dark:` per-component overrides — the `.dark {}` block in `variables.css` handles switching automatically via CSS cascade.

---

### styled-components Patterns

Use **only** when Tailwind cannot handle the style:

- Custom `@keyframes` animations
- `clip-path`, `mask`, `filter` with dynamic values
- `::before` / `::after` pseudo-elements with dynamic content
- Third-party component overrides requiring CSS specificity

**File organization:**

Option A — co-located (small components): place at bottom of `ComponentName.tsx`

Option B — separate file (larger components):

```
src/modules/chart/
├── ComplexChart.tsx           ← must render via `EChartWrapper`
└── ComplexChart.styles.ts
```

For any chart module created during slicing, keep the rendering engine on ECharts through `EChartWrapper`. Do not introduce Recharts, Chart.js, ApexCharts, Nivo, or custom SVG chart stacks while implementing Figma slices.

**Pattern:**

```tsx
// ComplexChart.styles.ts
import styled from "styled-components";

export const ChartContainer = styled.div<{ height: number }>`
  position: relative;
  height: ${({ height }) => height}px;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
  }
`;

export const AnimatedFill = styled.div<{ percent: number }>`
  width: ${({ percent }) => percent}%;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
```

**styled-components DO NOT:**

```tsx
// ❌ Don't use for things Tailwind can do
const RedText = styled.p`color: red; font-size: 14px;`;
// ✅ Use Tailwind instead
<p className="text-error-500 text-p14">

// ❌ Don't use inline style prop on styled-components
<StyledDiv style={{ color: 'red' }} />
```

---

## shadcn/ui Button Sizes

Components in `src/components/ui/` are auto-generated by shadcn. Preserve their behavior/accessibility; **edit variant definitions and default classes in the same files** when the active design system requires it. The `Button` primitive exposes the following sizes:

```tsx
<Button size="xs">Extra Small</Button>   {/* h-7 */}
<Button size="sm">Small</Button>          {/* h-8 */}
<Button size="default">Default</Button>   {/* h-9 */}
<Button size="md">Medium</Button>         {/* h-11 — use for form submit */}
<Button size="lg">Large</Button>          {/* h-11 */}
<Button size="icon">Icon</Button>         {/* square */}
```

> Pre-execution validator, full rules, and verification checklist: [references/slicing-ui-rules.md](references/slicing-ui-rules.md)

---

## Appendix — Token Maps for Known Design Systems

> These are **examples only**. The authoritative map for any session is always `design/[platform]/[theme]/DESIGN.md`.

### Tactical (dark-first, Montserrat)

| Property         | CSS variable               | Tailwind class                       |
| ---------------- | -------------------------- | ------------------------------------ |
| Page background  | `var(--bg-primary)`        | `bg-background-primary`              |
| Panel / card bg  | `var(--bg-secondary)`      | `bg-background-secondary`            |
| Body text        | `var(--font-primary)`      | `text-font-primary`                  |
| Muted / caption  | `var(--font-secondary)`    | `text-font-secondary`                |
| Placeholder text | `var(--font-placeholder)`  | `text-font-placeholder`              |
| Disabled text    | `var(--font-disabled)`     | `text-font-disabled`                 |
| Text on button   | `var(--font-on-accent)`    | `text-font-on-accent`                |
| Default border   | `var(--border-primary)`    | `border-border-primary`              |
| Subtle divider   | `var(--border-secondary)`  | `border-border-secondary`            |
| High-risk orange | `var(--state-orange-base)` | `bg-orange-500`                      |
| Primary button   | `var(--primary-base)`      | `bg-primary-500 text-font-on-accent` |

### Fusion (light-first, Inter)

| Property         | CSS variable                    | Tailwind class                       |
| ---------------- | ------------------------------- | ------------------------------------ |
| Page background  | `var(--bg-primary)`             | `bg-background`                      |
| Panel / card bg  | `var(--bg-secondary)`           | `bg-secondary`                       |
| Body text        | `var(--text-color-primary)`     | `text-foreground`                    |
| Muted / caption  | `var(--text-color-secondary)`   | `text-muted-foreground`              |
| Placeholder text | `var(--text-color-placeholder)` | `text-muted-foreground`              |
| Disabled text    | `var(--text-color-disabled)`    | `text-neutral-400`                   |
| Text on button   | `var(--text-color-on-accent)`   | `text-primary-foreground`            |
| Default border   | `var(--border-primary)`         | `border-border`                      |
| Pink/red accent  | `var(--quaternary-base)`        | `bg-quaternary-500`                  |
| Purple accent    | `var(--quinary-base)`           | `bg-quinary-500`                     |
| Primary button   | `var(--primary-base)`           | `bg-primary text-primary-foreground` |

### Adding a New Design System

No skill changes needed. Create the folder:

```
design/[platform]/[theme-name]/
├── DESIGN.md         ← define: font, mode, palettes, semantic vars, Tailwind classes, forbidden patterns
├── variable.css
└── tailwind.css
```

The agent will read `DESIGN.md` from that folder and apply its conventions automatically.
