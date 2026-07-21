---
name: reactjs-switch-theme
description: Step-by-step guide to switch design system themes in a React/TypeScript app. Works for ANY design system that follows the standard design/ folder structure. Covers copying canonical CSS files, updating theme.css, dark mode default, and font verification.
---

# Switch Theme Skill (React / TypeScript)

> Apply any design system theme to a React app by replacing `variables.css` and `theme.css`
> with the canonical files from `design/[platform]/[theme]/`.
> Works for any design system — not just Tactical or Fusion.

---

## When to Use This Skill

- Switching the active design system theme for a React app
- Regenerating CSS after the design contract or CSS variables are updated
- Onboarding a new React app that needs its theme variables populated

**With this skill, also load the DESIGN.md-adjacent skills** so component composition matches the active contract: `.claude/skills/reactjs-design-system/SKILL.md`, `.claude/skills/reactjs-slicing-ui/SKILL.md`, `.claude/skills/reactjs-app-layout/SKILL.md` (shell regions, `DESIGN.md` layout contract), and (if the shell uses shadcn Sidebar) `.claude/skills/reactjs-sidebar/SKILL.md`. The Cursor command `.claude/commands/switch-design-system.md` encodes the full read order.

---

## Step 0 — Resolve the Active Theme

Read `design/design-system.md` to confirm:

- `platform` — e.g. `web`, `mobile`
- `theme` — the active theme name (e.g. `tactical`, `fusion`, `carbon`, `material`)

All subsequent paths derive from these two values:

```
design/
└── [platform]/
    └── [theme]/
        ├── DESIGN.md         ← READ THIS FIRST — decision rules, token map, font, dark mode behavior
        ├── variable.css      ← CSS custom properties (:root + .dark)  ← COPY THIS
        └── tailwind.css      ← Tailwind v4 @theme mapping              ← ADAPT THIS
```

**Read `design/[platform]/[theme]/DESIGN.md` before doing anything else.**
It defines: font family, default mode (dark or light), semantic variable names, forbidden patterns,
and the Tailwind class reference for that specific theme.

> **Theme switching is applied by the AI in the IDE** — read the canonical files from `design/[platform]/[theme]/`
> and apply them directly. In Cursor, use the **`/switch-design-system`** command (`.claude/commands/switch-design-system.md`) as the standard entry point.

---

## Step 1 — Replace `variables.css`

Copy `design/[platform]/[theme]/variable.css` → `apps/[app]/src/styles/variables.css`.

**Keep all content as-is from the canonical file:**

- All `--base-*` palette values in `:root` (light/default-mode values)
- All semantic tokens (`--bg-*`, `--font-*`, `--border-*`, `--state-*`, brand scales, etc.)
- The complete `.dark {}` block (overrides `--base-*` to dark-mode values)
- `--radius-*`, `--shadow-*`, typography scale variables
- All shadcn/ui wiring variables (`--background`, `--foreground`, `--card`, `--sidebar`, etc.)

**Adapt if needed:**

- Spacing values: if the canonical file uses `px` units (`--spacing-1: 4px`) and the app needs `rem`,
  convert: 4px → 0.25rem, 8px → 0.5rem, etc. OR rely on Tailwind v4's `--spacing: 0.25rem` in `theme.css`
- Radius values: similarly convert `px` → `rem` if the boilerplate requires it

**Verify the result has all sections:**

```css
:root {
  /* --base-* palette (neutral, primary, secondary, tertiary, ...) */
  /* --base-* state colors (warning, error, success, info, ...) */
  /* Semantic tokens (--bg-*, --font-*, --border-*, --state-*, brand scales) */
  /* shadcn/ui wiring (--background, --foreground, --card, --sidebar, ...) */
  /* --radius-*, --shadow-*, typography scale */
}

.dark {
  /* ALL --base-* overridden to dark-mode values */
  /* shadcn/ui overrides for dark mode */
}
```

---

## Step 2 — Adapt `theme.css`

Base the new `theme.css` on `design/[platform]/[theme]/tailwind.css` with these adaptations:

1. **Remove** the `@import "tailwindcss";` line (already in `index.css`)
2. **Add** `--spacing: 0.25rem;` as the first entry in `@theme inline {}` (Tailwind v4 base spacing unit)
3. **Preserve** any project-specific animations from the previous `theme.css`
4. **Remove** palette groups that don't exist in the new theme — check `DESIGN.md` for the palette list

The result must include all color palette aliases (direct `--color-{palette}-{shade}` entries) plus
all semantic aliases that DESIGN.md defines as Tailwind classes:

```css
@theme inline {
  --spacing: 0.25rem;
  --font-sans: "..."; /* from DESIGN.md */

  /* Full base palette: --color-neutral-*, --color-primary-*, etc. */
  /* Semantic aliases: whatever DESIGN.md lists as Tailwind classes */
  /* shadcn/ui: --color-background, --color-foreground, --color-card, ... */
  /* --radius-*, --shadow-*, --text-* scale */
}
```

---

## Step 3 — Update Font in `index.html`

Read the font requirement from `design/[platform]/[theme]/DESIGN.md`.
Replace or add the Google Fonts `<link>` in `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family={FontName}:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

Also verify `theme.css` has the matching `--font-sans` value.

---

## Step 4 — Set the Default Mode on `<html>`

Read the **primary mode** from `design/[platform]/[theme]/DESIGN.md`:

| Primary mode | Action                                         |
| ------------ | ---------------------------------------------- |
| **Dark**     | Set `class="dark"` on `<html>` in `index.html` |
| Light        | Remove `class="dark"` from `<html>`            |

```html
<!-- Dark-first theme -->
<html lang="en" class="dark">
  <!-- Light-first theme -->
  <html lang="en"></html>
</html>
```

> **Why this matters:** `:root {}` in `variables.css` holds the default-mode values.
> The `.dark {}` block holds the alternate-mode overrides.
> Without the correct class on `<html>`, the app renders in the wrong mode.

---

## Step 5 — Verify the Result

### Visual check in browser

- Background color matches the theme's primary mode (dark theme → dark surface; light theme → light surface)
- Primary accent color matches the theme (check `DESIGN.md` for the expected primary color)
- Body text is readable on all surfaces

### Font check

- DevTools → Elements → Computed → `font-family` on `<body>` matches the expected font

### Dark mode check

- Toggle dark mode by adding/removing `class="dark"` on `<html>` in DevTools
- All surfaces switch correctly
- No invisible text, no transparent panels

### Palette cleanup

- Remove any Tailwind classes in components that reference a palette group that no longer exists in the new theme
- Check `DESIGN.md` of the **new** theme for the available palette list

### theme.css audit

- Every semantic class name listed in `DESIGN.md`'s "Decision Rules" table has a corresponding `--color-*` entry in `theme.css`
- No entry references a CSS variable that doesn't exist in `variables.css`

---

## Step 6 — Token Chain Integrity Check

```
DESIGN.md  →  design/variable.css  →  apps/variables.css  →  theme.css  →  component
```

Each layer must be complete. Verify:

| Layer                             | Check                                                                       |
| --------------------------------- | --------------------------------------------------------------------------- |
| `design/[platform]/[theme]/DESIGN.md` | Defines the active visual contract, semantic names, and composition rules |
| `apps/*/src/styles/variables.css` | All `--base-*` match the canonical `variable.css` values                    |
| `apps/*/src/styles/tailwind.css`  | All semantic classes in `DESIGN.md` are registered                          |
| Components                        | No raw hex, no arbitrary Tailwind, no direct `var(--base-*)` in `className` |

---

## Step 7 — Mandatory Composition Alignment (CRITICAL)

> Theme switching is NOT complete if only `variables.css` and `theme.css` are updated.
> After switching, you MUST hard-align component composition/style usage to `DESIGN.md` patterns.

**`src/components/ui/`:** Every base primitive in this folder must be reviewed — defaults and `cva` variants must match the active design system; downstream pages inherit appearance from here.

### 7.1 Extract required composition patterns from `DESIGN.md`

Before editing components, read and extract at minimum:

- Card pattern
- Sidebar/drawer panel pattern
- Table/list container pattern
- Form/dialog surface pattern

Enforce the active `DESIGN.md` composition contract. Example when the active design is Tactical:

- `bg-background-secondary border border-border-primary`
- Radius/shadow matches pattern (`rounded-none`; metric cards use no border, no shadow, no radius)
- Typography uses semantic classes (`text-font-primary`, `text-font-secondary`)
- shadcn primitives keep behavior/accessibility while variants/classes are aligned to active `DESIGN.md` tokens

### 7.2 Run a composition audit on touched pages/layouts

When updating app shell or feature pages, audit:

- `components/layouts/*`
- active page files in `pages/*`
- reusable wrappers that create surfaces/cards/panels

Flag as mismatch if:

- Component still uses default shadcn surface look without active `DESIGN.md` semantic classes
- Card/sidebar panel misses Tactical border/surface/radius/shadow combination
- Class composition deviates from the `DESIGN.md` quick-reference patterns

### 7.3 Required fix behavior

If mismatch found, apply immediately:

1. Keep semantic token classes from `DESIGN.md` as base
2. Add/adjust composition classes for structure (padding, radius, border, shadow)
3. Preserve shadcn/Radix behavior; only normalize token wiring, variants, and style composition

Do NOT declare theme switch complete until composition mismatches are fixed.

---

## Appendix — Known Design System Specifics

> These are examples. Any design system that follows the `design/[platform]/[theme]/` structure works.

### Tactical

| Property                  | Value                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Primary mode              | **Dark** — set `class="dark"` on `<html>`                                          |
| Font                      | Montserrat                                                                         |
| Primary color             | Cyan / Sky Blue                                                                    |
| Neutral scale             | **Inverted in dark mode** — `neutral-50` = near-black in `.dark`, white in `:root` |
| Extra palette             | `orange` (high-risk state)                                                         |
| Missing                   | No `quaternary`, no `quinary`                                                      |
| Semantic font vars        | `--font-primary`, `--font-secondary`, `--font-placeholder`, `--font-on-accent`     |
| Tailwind text classes     | `text-font-primary`, `text-font-secondary`, `text-font-placeholder`                |
| Tailwind bg classes       | `bg-background-primary`, `bg-background-secondary`                                 |
| Card composition baseline | `bg-background-secondary border border-border-primary rounded-none p-4`            |
| Metric card baseline      | `bg-background-secondary p-3 rounded-none shadow-none border-0`                    |
| Sidebar/panel baseline    | `bg-background-secondary border border-border-primary rounded-none`                |

### Fusion

| Property              | Value                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| Primary mode          | Light — no `class="dark"` on `<html>`                                        |
| Font                  | Inter                                                                        |
| Primary color         | Blue (navy)                                                                  |
| Neutral scale         | Standard (50=lightest, 900=darkest), same in light and dark                  |
| Extra palettes        | `quaternary` (pink/red), `quinary` (purple)                                  |
| Missing               | No `orange` state palette                                                    |
| Semantic font vars    | `--text-color-primary`, `--text-color-secondary`, `--text-color-placeholder` |
| Tailwind text classes | `text-foreground`, `text-muted-foreground` (shadcn defaults)                 |
| Tailwind bg classes   | `bg-background`, `bg-secondary` (shadcn defaults)                            |

---

> Detailed rules and validation checklist: [references/switch-theme-rules.md](references/switch-theme-rules.md)
