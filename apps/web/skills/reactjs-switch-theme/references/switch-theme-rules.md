# Switch Theme — Rules & Validation Checklist

> These rules apply to **any** design system theme.
> Specific per-theme examples (Tactical, Fusion, etc.) are in the Appendix section at the end of this file.

---

## Core Rules

**Rule 1 — Source of truth is `design/[platform]/[theme]/`**

- Always read `design/[platform]/[theme]/DESIGN.md` first — it defines the font, primary mode (dark/light), semantic variable names, available palettes, and Tailwind class conventions for that theme.
- Never invent semantic variable names — copy them exactly from the canonical `variable.css`.
- Never modify `design/` files — they are Figma export artifacts. Treat them as read-only.

**Rule 2 — Both `variables.css` AND `theme.css` must be updated together**

- `variables.css` provides the raw `--base-*` palette and semantic CSS variables.
- `theme.css` maps them to Tailwind utility classes via `@theme inline {}`.
- Updating only one causes a broken token chain — some Tailwind classes will produce no color.

**Rule 3 — `DESIGN.md` is the visual contract; never invent around it**

- `DESIGN.md` defines the font, mode, available palettes, semantic names, Tailwind aliases, and component composition contracts.
- Do not invent token names or composition recipes outside `DESIGN.md` / `variable.css`.

**Rule 4 — `@theme inline` must include `--spacing: 0.25rem`**

- Tailwind v4 requires this as the first entry in `@theme inline {}`.
- Without it, all spacing utilities (`p-4`, `m-2`, `gap-3`) break.

**Rule 5 — Set `<html class>` to match the primary mode**

- Read the primary mode from `DESIGN.md` (dark-first or light-first).
- Dark-first themes: `<html lang="en" class="dark">`
- Light-first themes: `<html lang="en">` (no class)
- **Never hardcode this** — always derive from `DESIGN.md` for the active theme.

**Rule 6 — Neutral scale direction depends on the theme**

- Some themes (e.g. Tactical) invert the neutral scale in dark mode: `neutral-50` = near-black, `neutral-900` = near-white.
- Some themes (e.g. Fusion) use a standard scale: `neutral-50` = lightest, `neutral-900` = darkest.
- Always check `DESIGN.md` and the `.dark {}` block in `variable.css` to confirm the direction.
- This directly affects `bg-neutral-50`, `text-neutral-900`, etc. in components.

**Rule 7 — Only use palettes that exist in the active theme**

- Each theme defines its own palette list (primary, secondary, tertiary, etc.) in `DESIGN.md`.
- Do not reference `bg-quaternary-*` or `text-quinary-*` if the active theme doesn't include those palettes.
- After switching themes, search for classes referencing removed palettes and replace them.

**Rule 8 — No raw hex or `var(--base-*)` in component `className`**

- Components must only use Tailwind semantic classes (`bg-background-primary`, `text-font-primary`, etc.)
- Allowed only in `variables.css` and `theme.css` — never in component JSX.

**Rule 9 — Preserve project-specific animations in `theme.css`**

- `theme.css` may contain project-specific `--animate-*` or `@keyframes` definitions.
- Keep these when adapting the canonical `tailwind.css` — the canonical file won't have them.

**Rule 10 — Additive-only: DESIGN.md is the primary guide**

- If `DESIGN.md` defines a semantic token that is NOT in the canonical `variable.css` or the app's `variables.css` → **add it**, do not skip it.
- When adding a new CSS variable: add to both `:root` AND `.dark {}` (with correct light/dark values), then register a Tailwind alias in `theme.css`.
- NEVER remove or reduce existing CSS variables from `variables.css` or entries from `theme.css` — only additive changes are allowed.
- Template files (`variables.css`, `theme.css`) are starting points. `DESIGN.md` is the authority.

**Rule 11 — Wire shadcn/ui variables in `variables.css`**

- shadcn/ui components use internal CSS variables (`--background`, `--foreground`, `--card`, `--popover`, `--border`, `--muted`, `--accent`, etc.)
- These MUST be mapped to the active theme's semantic tokens inside `variables.css` — both in `:root {}` and `.dark {}`.
- Do NOT override shadcn variables in component files or JSX.
- After switching themes, verify shadcn components (Button, Card, Dialog, Popover) render with correct theme colors.

---

**Rule 12 — Mandatory composition parity with `DESIGN.md`**

- Token parity alone is insufficient. Component composition MUST match the active theme patterns in `DESIGN.md`.
- For every touched page/layout, validate card/sidebar/panel/table/form surfaces against `DESIGN.md` references.
- If component uses shadcn defaults that visually diverge from `DESIGN.md`, override with semantic classes until aligned.

**Rule 13 — Sidebar and card are release blockers**

- Sidebar shell and card containers are mandatory visual anchors.
- Theme switch is considered FAILED if either:
  - Sidebar does not follow panel pattern from `DESIGN.md` (for Tactical dashboard: square surface, correct width, active-state behavior)
  - Card surfaces do not follow card pattern from `DESIGN.md` (for Tactical metric cards: flat, compact, no border/shadow/radius unless explicitly allowed)

**Rule 14 — Layout contract parity is mandatory**

- If `DESIGN.md` defines shell constraints (topbar height, sidebar width, page padding, section rhythm), implement them exactly.
- For Tactical command dashboards, treat shell constraints as release blockers.

**Rule 15 — Component contracts override defaults**

- If `DESIGN.md` defines contracts for Card/Sidebar/Panel/Table/Form, those contracts override default shadcn composition.
- Do not stop at token parity; enforce structure, density, hierarchy, and interaction states.

---

## Validation Checklist

After switching, verify each item:

### Visual

- [ ] Background surface matches the theme's primary mode (dark → dark surface, light → light surface)
- [ ] Primary accent color visible and matches DESIGN.md spec
- [ ] Body text is readable with sufficient contrast
- [ ] Toggle dark class on `<html>` — all surfaces switch cleanly

### Font

- [ ] Google Fonts link in `<head>` matches the font defined in DESIGN.md
- [ ] DevTools Computed → `font-family` on `<body>` shows the correct font
- [ ] `--font-sans` in `theme.css` matches the font name exactly

### Token Chain

- [ ] `variables.css` has complete `:root {}` (all `--base-*` + all semantic tokens)
- [ ] `variables.css` has complete `.dark {}` (all dark overrides)
- [ ] `theme.css` `@theme inline` includes `--spacing: 0.25rem`
- [ ] Every semantic class in DESIGN.md's Tailwind reference is present in `theme.css`
- [ ] No `--color-*` entry in `theme.css` references a missing `--variable` in `variables.css`

### Component cleanup

- [ ] No components reference palette groups removed by the new theme
- [ ] No raw hex colors in `className`
- [ ] No `var(--base-*)` direct usage in component JSX

### Composition parity (CRITICAL)

- [ ] Card/surface composition in touched pages matches `DESIGN.md` contracts (including density + radius policy + border/shadow policy)
- [ ] Sidebar/drawer shell composition matches `DESIGN.md` panel + sidebar contract (width, active state, hover behavior)

- [ ] Card/surface composition in touched pages matches `DESIGN.md` (background + border + radius + shadow + spacing)
- [ ] Sidebar/drawer shell composition matches `DESIGN.md` panel pattern
- [ ] Dialog/form/table containers use the semantic surface/border/text classes required by `DESIGN.md`
- [ ] No untouched default shadcn visual style remains on primary app shell surfaces
- [ ] Shell layout constraints in `DESIGN.md` are implemented (`topbar`, `sidebar`, `main spacing`)
- [ ] If Tactical dashboard mode is targeted, metric cards use flat command style (not generic rounded cards)

---

## How to Add a New Design System

Any new design system is supported immediately if it follows the folder convention:

```
design/
└── [platform]/
    └── [theme-name]/
        ├── DESIGN.md         ← Required: font, mode, token map, Tailwind classes, palettes
        ├── variable.css      ← Required: :root + .dark CSS custom properties
        └── tailwind.css      ← Required: Tailwind v4 @theme inline block
```

The agent will:

1. Read `DESIGN.md` to understand the theme's conventions
2. Copy `variable.css` to `apps/*/src/styles/variables.css`
3. Adapt `tailwind.css` to `apps/*/src/styles/tailwind.css`
4. Set the font and `<html>` class from `DESIGN.md`

No changes to the skill are required.

---

## Appendix — Per-Theme Migration Notes

### Tactical → Fusion

| Property            | Tactical (dark-first)   | Fusion (light-first)    |
| ------------------- | ----------------------- | ----------------------- |
| `<html>` class      | `class="dark"`          | _(remove class)_        |
| Font                | Montserrat              | Inter                   |
| Semantic text var   | `--font-primary`        | `--text-color-primary`  |
| Tailwind text class | `text-font-primary`     | `text-foreground`       |
| Tailwind bg class   | `bg-background-primary` | `bg-background`         |
| Extra palettes      | `orange`                | `quaternary`, `quinary` |
| Neutral 50 in dark  | near-black (inverted)   | lightest (standard)     |

### Fusion → Tactical

Reverse of the table above.

### Any New Theme

Read `DESIGN.md` for that theme. Its decision rules table and Tailwind class reference replace any per-theme table here.
