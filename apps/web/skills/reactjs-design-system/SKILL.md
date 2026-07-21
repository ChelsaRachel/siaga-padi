---
name: reactjs-design-system
description: Step-by-step guide to apply the active design system correctly in React apps, especially shadcn/ui templates initialized under apps/. Use whenever implementing UI, fixing visual drift, wiring tokens, editing shadcn variants, or aligning components to design/[platform]/[theme]/DESIGN.md.
---

# Design System Skill (React / TypeScript)

> Step-by-step guide to apply the active design system correctly.

## CRITICAL UPDATE — DESIGN.md Composition is Mandatory

Token correctness is necessary but not sufficient.
Every component must also follow composition patterns defined in `design/[platform]/[theme]/DESIGN.md`.

This means:

- Card, panel, sidebar, table wrapper, and form surfaces must match `DESIGN.md` structure classes.
- shadcn defaults are only a base primitive; override composition via semantic classes when needed.
- A screen is NOT design-system compliant if token names are correct but composition does not match `DESIGN.md`.
- Layout regions must also match `DESIGN.md`; header/sidebar/main must not overlap, especially when shadcn Sidebar uses fixed positioning.
- **Scrollable regions** must use **`PerfectScrollArea`** (`react-perfect-scrollbar`); thumb and rail colors are overridden globally in `styles/components.css` with **`--color-*` tokens** so scrollbars follow the active design system when variables/Tailwind theme change. See **`skills/reactjs-responsive/SKILL.md`** § *Scrollable regions*.

## shadcn/ui Contract — Behavior First, DESIGN.md Styling Second

When implementing UI inside `apps/` from a template that uses shadcn/ui:

- Use shadcn primitives for behavior, keyboard support, focus management, ARIA, portals, and form integration.
- Do not accept default shadcn visual output as final styling.
- Wire shadcn CSS variables (`--background`, `--card`, `--primary`, `--border`, `--sidebar-*`, etc.) to the active `DESIGN.md` token chain.
- Override component variants/classes so the rendered output follows `DESIGN.md` contracts.
- Keep behavior props intact (`asChild`, `isActive`, `aria-*`, `data-*`, controlled values, refs).
- Bypass shadcn only for simple static surfaces where it adds no behavior, such as metric cards, plain dashboard panels, or wrapper-only surfaces defined by the active `DESIGN.md`.

Decision rule:

| Need | Use |
| ---- | --- |
| Button, Input, Select, Dialog, Popover, Dropdown, Tooltip, Form, Sidebar | shadcn primitive + active `DESIGN.md` token/variant override |
| Metric card, simple panel, static dashboard card, table wrapper | Plain JSX wrapper using active `DESIGN.md` classes |
| Bounded scroll (sidebar body, main, panels, feeds) | **`PerfectScrollArea`** — not Radix `ScrollArea` for new work |
| shadcn primitive looks wrong | Fix token wiring or variant classes; do not replace behavior first |

---

## Step 0 — Resolve Active Theme from `design/design-system.md`

Before any UI edit:

1. Read `design/design-system.md`
2. Resolve active `platform` and `theme`
3. Read `design/[platform]/[theme]/DESIGN.md`
4. Use that theme's decision rules and composition patterns as source of truth

Never assume Fusion-only naming in a multi-theme repo.
Never assume Tactical-only naming either. Tactical, Fusion, or any future theme is valid if it is the active theme resolved from `design/design-system.md` and has a complete `DESIGN.md` contract.

---

---

## Step 0b — Read Active Design Files First

**Before writing or fixing any UI code**, read the active design files resolved from `design/design-system.md`.
Resolve paths dynamically from `design/design-system.md`. For example, if the active theme is `web/tactical`, this means:

```
design/web/tactical/DESIGN.md
design/web/tactical/variable.css
design/web/tactical/tailwind.css
```

Then trace the token chain:

1. `DESIGN.md` defines the visual contract, allowed token names, composition patterns, and forbidden patterns.
2. Theme `variable.css` implements base and semantic CSS variables.
3. App `src/styles/variables.css` must mirror/import those semantic values.
4. Theme/app `tailwind.css` maps variables to Tailwind utilities.

Never invent token values. If a value is not in the active theme files, resolve the token gap first.

---

## Step 1 — Verify Font is Loaded

Check `apps/web/index.html`. The font must match the active `DESIGN.md`.

Use the font declared by the active `DESIGN.md`. Example for Tactical:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

If missing → add it. No font = entire UI uses system fallback.

---

## Step 2 — Verify CSS Variables

Open `src/styles/variables.css`. Confirm all token groups exist under `:root` AND `.dark`.

Required groups: base colors (`--base-*`), semantic colors (`--primary`, `--background`, `--foreground`, etc.), sidebar (`--sidebar-*`), radius (`--radius-*`), typography (`--text-*`).

If any group is missing, add it by referencing the active theme token files as the source of truth.

---

## Step 3 — Verify Theme Aliases

Open `src/styles/tailwind.css`. The `@theme inline` block must have a `--color-*` alias for every CSS variable used in Tailwind classes.

If a new semantic color is added to `variables.css` but missing from `tailwind.css`, add the alias.

---

## Step 4 — Replace Hardcoded Values

Scan the component for:

- Raw hex → `#0d5eba`, `rgb(...)` → replace with token class
- Tailwind default palette → `blue-500`, `gray-200` → replace with active theme token classes
- Arbitrary values → `text-[14px]`, `p-[16px]` → replace with `text-p14`, `p-4`

Use the quick-reference table:

| Hex          | Tailwind token class                       |
| ------------ | ------------------------------------------ |
| Primary blue | `bg-primary-500` / `text-primary-500`      |
| Neutral gray | `bg-neutral-*` / `text-neutral-*`          |
| Page surface | Use active `DESIGN.md` semantic class; Tactical example: `bg-background-primary` |
| Panel/card surface | Use active `DESIGN.md` semantic class; Tactical example: `bg-background-secondary` |
| Text | Use active `DESIGN.md` semantic class; Tactical example: `text-font-primary`, `text-font-secondary` |
| Border | Use active `DESIGN.md` semantic class; Tactical example: `border-border-primary`, `border-border-secondary` |
| Error/danger | `bg-error-500`, `text-error-500`           |
| Warning      | `bg-warning-500`, `text-warning-500`       |
| Success      | `bg-success-500`, `text-success-500`       |

---

## Step 4b — Hard-Align Composition Patterns (MANDATORY)

Before finalizing any UI change, compare touched components against `DESIGN.md` quick patterns.

### Required composition audit targets

- App shell (`AppLayout`, `AppSidebar`, `AppHeader`)
- Page-level card/panel wrappers
- Dialog/form wrappers
- Table/list containers

### Minimum checks per surface

- Surface class (`bg-background-*` or `bg-card`) is correct for that theme
- Border class (`border-border-*` or `border-border`) is present and correct
- Radius and shadow match the active `DESIGN.md` pattern
- Typography semantic classes are used (`text-font-*` / `text-foreground`, etc.)
- Header/sidebar/main occupy separate regions; no fixed sidebar covers the topbar or page content
- Fixed shadcn sidebar width and offset match the active layout contract

If any surface deviates from `DESIGN.md`, fix immediately.

---

## Step 5 — Dark Mode Verification

Toggle dark mode (add `.dark` class to `<html>`). Verify:

- No element appears transparent or invisible
- Text contrast is sufficient
- All sidebar, card, and modal surfaces have the correct dark background

---

## Step 6 — Typography Application

Apply typography scale to headings and text:

```tsx
<h1 className="text-h3 font-semibold">Page Title</h1>
<p className="text-p14 text-font-secondary">Description text</p>
<span className="text-p12 text-font-secondary">Caption</span>
```

---

## Common Fix Patterns

### Fix: sidebar transparent

Missing `--sidebar-*` variables → add to `variables.css` + alias in `tailwind.css`.

### Fix: wrong font rendering

Missing Google Fonts link in `index.html` → add preconnect + stylesheet link.

### Fix: color mismatch vs design

Component uses `bg-blue-500` → replace with `bg-primary-500`.

### Fix: dark mode broken

A CSS variable is defined in `:root` but not in `.dark` → add it.

### Fix: header and sidebar overlap

The app shell is structurally wrong, not just visually wrong. If the topbar is full-width and the sidebar uses shadcn fixed desktop behavior, render the shell as:

1. Root: `flex h-screen flex-col overflow-hidden`
2. Header: full-width top region with active `DESIGN.md` height
3. Body row: `flex min-h-0 flex-1 overflow-hidden`
4. Sidebar: fixed panel offset by header height
5. Main: `flex-1 overflow-auto`

Example for Tactical: header `h-12`, sidebar `top-12 h-[calc(100svh-3rem)] w-[220px]`.

---

## Rules & Constraints

### Font

#### ✅ ALLOWED

| Rule                                                                             | Reason                                        |
| -------------------------------------------------------------------------------- | --------------------------------------------- |
| Load the active `DESIGN.md` font via Google Fonts `<link>` tag in `index.html`   | Font must be available before first paint     |
| Use `preconnect` for `fonts.googleapis.com` and `fonts.gstatic.com`              | Reduces font load latency                     |
| Reference font only via CSS variable `--font-sans` or Tailwind class `font-sans` | Single source of truth                        |
| Weights to load: `400;500;600;700`                                               | Covers all text variants in the design system |

#### ❌ NOT ALLOWED

| Rule                                                                | Reason                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| ❌ Inline `font-family` style in components                         | Bypasses the design system font variable                |
| ❌ Importing font from `npm` package instead of Google Fonts CDN    | Creates bundle bloat; CDN has better caching            |
| ❌ Omitting the `<link>` tag in `index.html`                        | Font fallback to system-ui looks wrong and inconsistent |
| ❌ Using any font other than the active `DESIGN.md` font without explicit design approval | Prevents theme drift |

### Color Tokens

#### ✅ ALLOWED

| Rule                                                                                                | Reason                                                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Use Tailwind utility classes mapped to tokens: `bg-primary-500`, `text-font-primary`, `border-border-primary` | Tokens defined in `tailwind.css` → `variables.css` |
| Use semantic classes for surfaces: `bg-background-primary`, `bg-background-secondary` | Switch automatically between light/dark via CSS variable swap |
| Use palette classes for brand/state: `bg-primary-*`, `text-error-*`, `bg-warning-50`                | Full scale available from 50–900                              |

#### ❌ NOT ALLOWED

| Rule                                                                        | Reason                                    |
| --------------------------------------------------------------------------- | ----------------------------------------- |
| ❌ Hardcoded hex in className or style → `bg-[#0d5eba]`, `color: '#5b5d63'` | Breaks dark mode; not maintainable        |
| ❌ Tailwind default palette → `blue-500`, `gray-200`, `red-400`             | Must use active design-system token palette instead |
| ❌ Adding new CSS variables locally inside a component file                 | New tokens belong in `variables.css` only |

### CSS Variable Completeness

Every UI component group that uses semantic CSS variables **must** have those variables defined in `variables.css` (both `:root` light and `.dark` blocks).

#### Known required variable groups

| Component        | Variables required                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar (shadcn) | `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring` |
| shadcn base      | `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`                        |
| Radius           | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`                                                                                        |

### Adding a New CSS Variable

When a new design token is needed, follow this exact order:

1. Confirm the token is defined or approved by the active `DESIGN.md` contract
2. Add the variable to `src/styles/variables.css` in **both** `:root` and `.dark` blocks
3. Alias it in `src/styles/tailwind.css` `@theme inline` as `--color-*` so it becomes a Tailwind utility

Never add a CSS variable directly in a component file or invent values that are not covered by `DESIGN.md` / `variable.css`.

### Typography Scale

| Tailwind class | Pixel size | Use for             |
| -------------- | ---------- | ------------------- |
| `text-display` | 60px       | Hero titles         |
| `text-h1`      | 44px       | Page headings       |
| `text-h2`      | 36px       | Section headings    |
| `text-h3`      | 28px       | Card / panel titles |
| `text-h4`      | 24px       | Sub-section titles  |
| `text-h5`      | 20px       | Component headings  |
| `text-h6`      | 18px       | Small headings      |
| `text-p16`     | 16px       | Body text (large)   |
| `text-p14`     | 14px       | Body text (default) |
| `text-p12`     | 12px       | Captions, labels    |

#### ❌ NOT ALLOWED

- ❌ `text-[14px]`, `text-[16px]` — use `text-p14`, `text-p16`
- ❌ `text-sm`, `text-base` — use the token scale above
- ❌ Inline `font-size` style

### Spacing & Border Radius

- Spacing unit: `1 unit = 4px` at 14px base → use `p-1` through `p-10` (no arbitrary values)
- Border radius: follow the active `DESIGN.md`. If the active design is Tactical, command surfaces default to `rounded-none`; another design system may define a different radius policy.

---

## Pre-Submission Verification Checklist

- [ ] Design tokens sourced from active `DESIGN.md`, `variable.css`, and `tailwind.css` — no invented values
- [ ] Active theme resolved from `design/design-system.md` before implementation
- [ ] `index.html` has the active `DESIGN.md` Google Fonts `<link>` tags with preconnect
- [ ] Zero hardcoded hex colors in components
- [ ] No Tailwind default palette classes (`blue-*`, `gray-*`, etc.)
- [ ] All CSS variables referenced in components exist in `variables.css` `:root` AND `.dark`
- [ ] Typography uses token classes (`text-h*`, `text-p*`) — no `text-sm`/`text-base`/`text-[px]`
- [ ] Spacing uses token scale — no arbitrary `p-[16px]` values
- [ ] Dark mode renders correctly (no transparent or invisible elements)
- [ ] Card/sidebar/panel composition in touched files is aligned to `DESIGN.md` patterns
- [ ] Header/sidebar/main layout regions do not overlap
- [ ] shadcn components keep behavior/accessibility but render with active theme token/variant overrides
