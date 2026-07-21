---
name: reactjs-responsive
description: Step-by-step guide to implement responsive layouts for every feature. Covers mobile-first approach, breakpoints, layout patterns, responsive component patterns, and scrollable regions using react-perfect-scrollbar where appropriate.
---

# Responsive Skill (React / TypeScript)

> Step-by-step guide to implement responsive layouts for every feature.

---



## Step 1 — Identify Layout Pattern

Determine what layout the feature needs:

| Feature type | Base pattern |
|-------------|-------------|
| List / feed | Single column → 2–3 col grid on larger screens |
| Form | Single column → 2-col grid on `sm:` |
| Dashboard | Stacked cards → responsive grid |
| Detail page | Full width → max-width constrained on desktop |
| Data table | Horizontal scroll on mobile, full table on desktop |

---

## Step 2 — Write Mobile-First

Start with the smallest screen. Add responsive overrides upward.

```tsx
// ✅ Mobile-first grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// ✅ Mobile-first flex direction
<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

// ✅ Mobile-first padding
<div className="px-4 py-4 md:px-6 md:py-6 lg:px-8">

// ✅ Show/hide
<div className="hidden md:block">  {/* desktop only */}
<div className="block md:hidden">  {/* mobile only */}
```

---

## Step 3 — Page-Level Container

Every page should have a responsive container:

```tsx
// Standard content page
<div className="mx-auto w-full max-w-screen-xl px-4 md:px-6 lg:px-8 py-6">
  {children}
</div>

// Narrow form/detail page
<div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-10">
  {children}
</div>

// Full-bleed dashboard
<div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
  {children}
</div>
```

---

## Step 4 — Responsive Typography

```tsx
<h1 className="text-h4 md:text-h3 lg:text-h2 font-bold">Title</h1>
<p className="text-p12 md:text-p14">Description</p>
```

---

## Step 5 — Responsive Forms

```tsx
<form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FormField name="firstName" ... />
  <FormField name="lastName" ... />
  <FormField name="notes" className="sm:col-span-2" ... />  {/* full width */}
</form>
```

---

## Step 6 — Responsive Data Table

When DataTable is too wide for mobile, wrap in a scrollable container:

```tsx
<div className="w-full overflow-x-auto rounded-lg border">
  <DataTable columns={columns} data={data} />
</div>
```

Or switch to card/list view on mobile:

```tsx
<div className="hidden md:block">
  <DataTable columns={columns} data={data} />
</div>
<div className="block md:hidden">
  <DataList>{data.map(row => <MobileCard key={row.id} row={row} />)}</DataList>
</div>
```

---

## Scrollable regions — `react-perfect-scrollbar` (**mandatory**)

**Policy:** Any **in-app** scrollable region (bounded box where content overflows vertically or horizontally) **must** use **`react-perfect-scrollbar`**, not native `overflow-auto` / `overflow-y-scroll` as the primary UX. Styling is **global and token-driven**: thumb/rail colors use `--color-muted-foreground`, `--color-foreground`, and `--color-muted` overrides in `apps/*/src/styles/components.css` so rails track the **active design system** after theme switch.

### Canonical wrapper

Use the shared wrapper (adds `perfect-scroll-area` + `min-height: 0`):

```tsx
import { PerfectScrollArea } from "@/components/wrappers/PerfectScrollArea";

<div className="relative min-h-0 flex-1">
  <PerfectScrollArea className="h-full max-h-full" options={{ wheelPropagation: false }}>
    {children}
  </PerfectScrollArea>
</div>
```

Base CSS is imported **once** from `src/index.css` (`react-perfect-scrollbar/dist/css/styles.css` **before** `components.css`). Do **not** re-import library CSS in feature files.

### Where this applies

| Must use `PerfectScrollArea` | Examples |
|-----------------------------|----------|
| ✅ | Main content column, sidebar body, drawer/sheet body, inspector panels, feed strips, fixed-height list/card stacks, dialog inner scroll |
| ✅ | Data regions inside a **fixed-height** layout (table body inside constrained panel — vertical PS; horizontal overflow may still use CSS where PS is vertical-only and pattern is table `overflow-x-auto` — prefer wrapping inner content with PS when both axes matter) |

### Narrow exceptions (native overflow allowed)

| Exception | Notes |
|-----------|--------|
| **`document` / viewport** body scroll | Browser handles full-page scroll; no PS |
| **Native controls** | `<textarea>`, `<select>` popovers, browser-native pickers |
| **Horizontal-only emergency** | Very wide tables: outer `overflow-x-auto` **wrapper** is OK for **x** if vertical scroll inside row uses PS; avoid duplicating both axes with conflicting handlers |
| **Third-party embed** | Map canvas, PDF viewer — follow that component’s rules |

Do **not** use shadcn **`ScrollArea`** (Radix) for **new** bounded regions — prefer **`PerfectScrollArea`**. When touching legacy Radix `scroll-area.tsx`, migrate to `PerfectScrollArea` if the region is a standard app scroll pocket.

### Layout & resize

1. **Parent must define height** — same as map/layout: `flex-1 min-h-0`, explicit `h-*`, or `absolute inset-0` inside a `relative` bounded parent.
2. **After layout changes** (sidebar toggle, split resize), refresh geometry via `react-perfect-scrollbar` ref / `updateScroll()` when container size changes without unmount.

### ❌ Forbidden as default UI

| Pattern | Reason |
|--------|--------|
| `overflow-y-auto` / `overflow-auto` **alone** on dashboard panels, sidebars, feeds | Use **`PerfectScrollArea`** |
| `scrollbar-thin` as the **primary** scroll UX for app regions | Legacy fallback only; PS + tokens is standard |
| Importing Perfect Scrollbar CSS in many leaf files | Global import in `index.css` only |
| PS wrapper without bounded height chain | Broken geometry |

---

## Step 7 — Test

Open browser DevTools → toggle device toolbar. Check:

| Viewport | Key checks |
|----------|-----------|
| 375px | No horizontal scroll; text readable; buttons ≥ 44px |
| 768px | Layout transitions look correct |
| 1280px | Full desktop layout as designed |

Use `Tailwind CSS IntelliSense` in VS Code to preview class effects.

---

## Common Responsive Patterns

### Page header with actions

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
  <h1 className="text-h4 font-semibold">Page Title</h1>
  <Button size="sm">Add New</Button>
</div>
```

### Stats/metric cards

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <MetricCard label="Total" value="128" />
  <MetricCard label="Active" value="42" />
  {/* ... */}
</div>
```

### Modal/Dialog sizing

```tsx
<DialogContent className="w-full max-w-sm sm:max-w-md">
```

---

## Rules & Constraints

### Breakpoint Reference

| Prefix | Min-width | Device target |
|--------|-----------|---------------|
| *(none)* | 0px | Mobile (default) |
| `sm:` | 640px | Large mobile / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Wide desktop |

### Layout Rules

#### ✅ ALLOWED

| Rule | Example |
|------|---------|
| Mobile-first column → expand on larger screens | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Stack vertically on mobile, row on desktop | `flex flex-col md:flex-row` |
| Full-width on mobile, constrained on desktop | `w-full lg:max-w-4xl` |
| Sidebar hidden / collapsed on mobile | Use `SidebarProvider` + shadcn collapsible sidebar |
| Responsive padding/margin | `p-4 md:p-6 lg:p-8` |
| Responsive font size | `text-h4 md:text-h3` |
| Responsive gap | `gap-3 md:gap-5` |
| Hide element on mobile | `hidden md:block` |
| Show only on mobile | `block md:hidden` |
| Bounded scroll regions | `PerfectScrollArea` from `@/components/wrappers/PerfectScrollArea` — themed `.ps__*` in `components.css` |

#### ❌ NOT ALLOWED

| Rule | Reason |
|------|--------|
| ❌ Primary scroll UX via raw `overflow-auto` / `scrollbar-thin` on app shells, sidebars, feeds | Must use **`PerfectScrollArea`** (see **Scrollable regions** above) |
| ❌ Fixed pixel width for layout containers → `width: 1200px` | Overflows on small screens |
| ❌ Layout that only works on desktop (no mobile styles) | All features must be usable on mobile |
| ❌ `overflow: hidden` on `body`/`html` to fix mobile scrollbar | Breaks other pages |
| ❌ Hardcoded `height: calc(100vh - 64px)` without responsive override | Different header heights on mobile |
| ❌ Tiny tap targets < 44px on mobile | Fails touch usability |

### Component-Level Responsive Rules

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Sidebar | Collapsed (sheet/drawer) | Collapsed or icon-only | Expanded |
| DataTable | Scroll horizontally or switch to card view | Partial columns | Full columns |
| Modals/Dialogs | Full-screen or bottom sheet | Centered, max-w-sm | Centered, max-w-md |
| Form grid | 1 column | 2 columns | 2–3 columns |
| Page header | Stack title + actions vertically | Row | Row |
| Navigation tabs | Scrollable horizontal | Normal | Normal |

---

## Testing Checklist

- [ ] Tested at 375px (iPhone SE) — no horizontal scroll, all interactive elements reachable
- [ ] Tested at 768px (iPad) — layout transitions correctly
- [ ] Tested at 1280px (Desktop) — full layout displayed as designed
- [ ] Sidebar collapses on mobile without breaking content area
- [ ] All forms usable on mobile (inputs not too small, keyboard doesn't cover submit)
- [ ] Tables/lists scroll or reflow correctly on small screens
- [ ] Long sidebar/panel scroll regions use `react-perfect-scrollbar` when the template standard requires it (see **Scrollable regions** above)
- [ ] No content clipped or overflowing viewport horizontally
- [ ] Touch targets ≥ 44×44px on all interactive elements
