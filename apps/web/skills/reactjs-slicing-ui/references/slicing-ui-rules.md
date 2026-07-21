# Slicing UI — Rules & Constraints

---

## Pre-Execution Validator

> Run this checklist **before writing any FE code**.
> All items must be checked. Any failure = task blocked.

### Step 1 — Resolve Active Design System

- [ ] Read `design/design-system.md` → confirm `platform` and `theme` from Active Config
- [ ] Locate the active theme folder: `design/[platform]/[theme]/`
- [ ] Confirm the folder exists (not just `.gitkeep`)
- [ ] If folder is missing → **STOP**, notify user to initialize the theme first

### Step 2 — Load Required Design Files

Load the active design files before writing any code:

- [ ] `DESIGN.md` → read fully (token chain, decision rules, forbidden patterns)
- [ ] `variable.css` → read to understand semantic tokens and dark mode overrides
- [ ] `tailwind.css` → read to understand Tailwind class mapping

> If any file is empty or missing, load what's available and note the gap.

### Step 3 — Confirm Theme Behavior (from `DESIGN.md`)

Read `design/[platform]/[theme]/DESIGN.md` and confirm:

- [ ] **Default mode** (dark-first or light-first) — drives `<html class="dark">` or not
- [ ] **Font** — verify the Google Fonts link in `index.html` matches
- [ ] **Neutral scale direction** — standard (50=lightest) or inverted (50=darkest, as in Tactical)
- [ ] **Available palette groups** — list of palettes this theme defines (e.g. primary, secondary, tertiary, orange)
- [ ] **Forbidden palette groups** — palettes from a different theme must not be referenced
- [ ] Tailwind default palette (`blue-*`, `gray-*`, etc.) is NEVER allowed — use theme tokens only
- [ ] Tokens from a different theme are NEVER mixed into the active theme

### Step 4 — Forbidden Pattern Pre-Check

Before writing, verify you will NOT use:

- [ ] No hardcoded hex values (`#ffffff`, `rgb(...)`, `hsl(...)`)
- [ ] No arbitrary Tailwind values (`bg-[#2EB3E8]`, `p-[16px]`, `text-[14px]`)
- [ ] No Tailwind default palette classes (`bg-blue-500`, `text-gray-900`)
- [ ] No `font-family` hardcoded inside component files
- [ ] No direct CSS variable reference in `className` (`bg-[var(--base-neutral-100)]`)
- [ ] No mobile tokens used in web tasks (and vice versa)
- [ ] No tokens from a different theme (e.g., Fusion tokens in a Tactical component)
- [ ] Composition map extracted from `DESIGN.md` for card/sidebar/panel/form/table

---

## Allowed

### Styling Priority Order

Apply styles in this exact priority — do not skip:

```
1. Tailwind CSS classes      ← always try first
2. styled-components         ← only when Tailwind cannot handle it
3. ❌ Inline styles          ← FORBIDDEN (see exception below)
```

### Token Usage

| #   | Rule                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| ✅  | Use Tailwind utility classes that map to design tokens (e.g. `bg-primary-500`, `text-h4`, `rounded-lg`, `p-4`)        |
| ✅  | Use semantic token classes for surface, text, and border (e.g. `bg-background`, `text-foreground`, `border-border`)   |
| ✅  | Use palette scale classes for brand and state colors (e.g. `bg-primary-500`, `text-error-500`, `bg-warning-50`)       |
| ✅  | Use `cn()` from `@/lib/utils` for conditional and merged class names                                                  |
| ✅  | Use the `.dark {}` override mechanism already defined in `variables.css` — do not fork dark mode styles per-component |
| ✅  | Enforce `DESIGN.md` composition on every surface (background + border + radius + shadow + spacing + semantic text) |

### styled-components (Fallback Only)

Use `styled-components` **only** when Tailwind cannot handle the style:

| ✅ Use when…                                      | ❌ Do NOT use when…                      |
| ------------------------------------------------- | ---------------------------------------- |
| Complex `@keyframes` animations                   | Basic layout, color, spacing             |
| `clip-path`, `mask`, `filter` with dynamic values | Conditional classes (use `cn()` instead) |
| `::before` / `::after` with dynamic content       | Static styles Tailwind covers            |
| Third-party overrides requiring CSS specificity   | Anything expressible with Tailwind       |

Rules when using `styled-components`:

- Place at the **bottom** of the file or in a co-located `*.styles.ts` file
- Name descriptively: `StyledCard`, `AnimatedBar`, `OverlayBackdrop`
- Never use `style={{}}` prop on styled-components

### Project Component Structure

| #   | Rule                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------- |
| ✅  | **MANDATORY:** Check `src/components/ui/` for existing UI primitives before creating any new component    |
| ✅  | Place UI primitives in `components/ui/` — single primitive, no domain logic                              |
| ✅  | Place shared components in `components/common/` — reusable cross-feature, no direct API calls            |
| ✅  | Place feature modules in `modules/{feature}/` — feature-scoped, may hold own store + state + fetch logic |
| ✅  | Place layout shells in `components/layouts/` — `AppLayout`, `AppSidebar`, `AppHeader`, `AppFooter`       |
| ✅  | Place pages in `pages/` — only level allowed to own data fetching; named `{Name}Page.tsx`                |
| ✅  | Accept a `className?: string` prop on every component and forward it via `cn()` for composability        |
| ✅  | Import direction is one-way only: `pages → modules → common → ui`                                        |

### Token Conflict Resolution (inside `apps/`)

| #   | Rule                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- |
| ✅  | When a divergent value is found in `apps/`, identify the correct token from `variables.css` and replace it |
| ✅  | Use the token quick-reference table in `SKILL.md` to resolve common hex → class mappings                   |
| ✅  | After replacement, verify the visual result matches the original design intent                             |

---

## Forbidden

### Hard-Coded Values

| #   | Rule                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ❌  | Do not use raw hex colors — never `bg-[#0d5eba]` or `style={{ color: '#5b5d63' }}`                                                    |
| ❌  | Do not use arbitrary Tailwind pixel values when a token covers the case — never `text-[14px]`, `p-[16px]`, `rounded-[8px]`            |
| ❌  | Do not use arbitrary rem values when a spacing or typography token exists                                                             |
| ❌  | Do not use Tailwind's default color palette (`blue-500`, `red-400`, `gray-200`, etc.) — use the active theme's token palette instead  |
| ❌  | Do not override `--base-*` CSS variables inside component files or style blocks                                                       |
| ❌  | Do not REMOVE or reduce any existing CSS variable from `variables.css` or `theme.css` — only additive changes are allowed             |

### Component Structure Violations

| #   | Rule                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- |
| ❌  | Do not make API calls inside UI primitives or shared components — data fetching belongs in modules or pages |
| ❌  | Do not build a feature module inline inside a `pages/` file — extract it to `modules/{feature}/`            |
| ❌  | Do not place layout grid code inside a feature module — layout belongs in `components/layouts/`             |
| ❌  | UI primitives must NOT import from `components/common/` or `modules/`                                       |
| ❌  | Shared components must NOT import from `modules/`                                                           |
| ❌  | Do not use raw `<button>`, `<input>`, `<span>` in shared/module code if a UI primitive exists for it        |

### Styling Anti-Patterns

| #   | Rule                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------- |
| ❌  | **`style={{...}}` is FORBIDDEN** — no inline styles, no exceptions; use Tailwind or styled-components |
| ❌  | Do not use `styled-components` for anything Tailwind can handle                                       |
| ❌  | Do not use `@apply` inside component files — only allowed in `components.css` via `@utility`          |
| ❌  | Do not write inline `<style>` blocks inside React components                                          |
| ❌  | Do not add custom Tailwind classes that duplicate an existing token alias                             |
| ❌  | Do not use `!important` anywhere in component styles                                                  |
| ❌  | Do not create a separate dark mode class per component — use the global `.dark {}` cascade            |
| ❌  | Do not keep default shadcn surface appearance on primary card/sidebar/panel wrappers when `DESIGN.md` defines explicit composition |

### Cross-Theme / Cross-Platform Violations

| #   | Rule                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------- |
| ❌  | Do not use Fusion tokens when the active theme is Tactical (or vice versa)                                     |
| ❌  | Do not use web tokens for mobile tasks, or mobile tokens for web tasks                                         |
| ❌  | Do not hardcode a theme name in component code — always resolve from `design/design-system.md` Active Config   |

### Token Conflict Resolution Violations

| #   | Rule                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------- |
| ❌  | Do not leave arbitrary values in `apps/` components even if they "look correct" — if there is a token, use it |
| ❌  | Do not resolve a conflict by adding a new CSS variable locally in a component — fix it in `variables.css` + `theme.css` |

### Composition Conflict Resolution Violations

| #   | Rule |
| --- | ---- |
| ❌  | Do not treat token correctness as done when component composition still diverges from `DESIGN.md` |
| ❌  | Do not skip card/sidebar/panel composition audit on touched layout and page files |
| ❌  | Do not leave mixed recipes (default primitive + partial theme override) on primary surfaces |

---

## Additive-Only Rule

> **`DESIGN.md` is the primary source of truth for ALL UI decisions.**
> The template (`variables.css`, `theme.css`) is a starting point — it can be extended, never reduced.

### The Rule in One Sentence

Adding variables/fields is always allowed. Removing or reducing existing variables/fields is never allowed.

### When DESIGN.md Requires a Token Missing from the Template

This is called a **Token Gap**. Follow this procedure:

**Step 1 — Confirm the gap**
- The token is defined in `DESIGN.md` (or `design/[platform]/[theme]/variable.css`)
- The token does NOT exist in `apps/[app]/src/styles/variables.css`

**Step 2 — Add to `variables.css`**
Add the new CSS variable in the correct semantic section (Background, Border, Font, State, Brand, etc.):
```css
:root {
  /* existing variables... */
  --your-new-token: var(--base-neutral-200); /* light-mode value */
}

.dark {
  /* existing overrides... */
  --your-new-token: var(--base-neutral-700); /* dark-mode value */
}
```

**Step 3 — Add to `theme.css`**
Register the new Tailwind class in `@theme inline {}`:
```css
@theme inline {
  /* existing entries... */
  --color-your-new-token: var(--your-new-token);
}
```

**Step 4 — Use in component**
Reference only the Tailwind class in JSX — never the raw CSS variable:
```tsx
<div className="bg-your-new-token">...</div>
```

**What you MUST NOT do:**
```tsx
// ❌ Use CSS var directly in className
<div className="bg-[var(--your-new-token)]" />

// ❌ Skip theme.css registration and use inline style
<div style={{ background: 'var(--your-new-token)' }} />

// ❌ Remove an existing variable to "make room"
```

### Additive Rules

| #  | Rule |
|----|------|
| ✅ | Add new CSS variables to `variables.css` when `DESIGN.md` defines tokens not yet in the template |
| ✅ | Add the corresponding Tailwind alias to `theme.css` for every new CSS variable added |
| ✅ | Add both `:root` (light) and `.dark` overrides for every new variable (unless it doesn't change between modes) |
| ✅ | Document added variables with a comment if they are shadcn/ui-specific or project-specific |
| ❌ | Never remove or rename existing CSS variables from `variables.css` |
| ❌ | Never remove or rename existing Tailwind entries from `theme.css` |
| ❌ | Never reduce the `.dark {}` block — only extend it |

---

## shadcn/ui Compatibility Rules

> The React template uses shadcn/ui. shadcn components consume their own internal CSS variables
> (`--background`, `--foreground`, `--card`, `--popover`, `--muted`, `--accent`, `--border`, etc.).
> These MUST be wired in `variables.css` to the active theme's semantic tokens — NOT overridden in component files.

### Wiring Pattern

Always wire in `variables.css`, never in component files:

```css
/* variables.css — wire shadcn vars to theme semantic tokens */
:root {
  --background: var(--bg-primary);
  --foreground: var(--font-primary);
  --card: var(--bg-secondary);
  --card-foreground: var(--font-primary);
  --popover: var(--bg-secondary);
  --popover-foreground: var(--font-primary);
  --border: var(--border-primary);
  --input: var(--border-primary);
  --muted: var(--bg-secondary);
  --muted-foreground: var(--font-secondary);
  --accent: var(--bg-secondary);
  --accent-foreground: var(--font-primary);
  /* ... */
}
```

### shadcn Rules

| #  | Rule |
|----|------|
| ✅ | All shadcn CSS variables (`--background`, `--foreground`, etc.) must be wired in `variables.css` to the active theme's semantic tokens |
| ✅ | When DESIGN.md introduces a new semantic token that shadcn needs, add the wiring in `variables.css` |
| ✅ | Use shadcn's token names (`bg-background`, `text-foreground`, `bg-card`) for shadcn primitives — these resolve through the wired variables |
| ✅ | When adding a new shadcn component, verify it uses theme tokens, not its default hardcoded values |
| ❌ | Do NOT override shadcn CSS variables inside component files or JSX |
| ❌ | Do NOT add hardcoded hex values to shadcn component variants |
| ❌ | Do NOT install shadcn components and leave their default palette (blue, gray) — always verify wiring |

### Checking shadcn Variable Wiring After Theme Switch

After switching themes, verify shadcn variables are correctly wired:
1. Inspect a `<Button>` and `<Card>` in DevTools — confirm their background/text colors match the active theme
2. Open a `<Dialog>` or `<Popover>` — confirm overlay background is the theme's `--bg-secondary`
3. Toggle the `.dark` class on `<html>` — confirm all shadcn components switch colors cleanly
4. If a shadcn component doesn't switch: the wiring variable is likely missing from `.dark {}` in `variables.css` — add it

---

## Verification

Code is considered complete when **all** of the following are true:

### Token Compliance

- [ ] Every color maps to a token class or CSS variable — zero raw hex values
- [ ] Every spacing value maps to a token spacing step (`p-1` through `p-20`)
- [ ] Every font size maps to a token text class (`text-display`, `text-h1`–`text-h6`, `text-p16`, `text-p14`, `text-p12`)
- [ ] Every border radius maps to a token radius class (`rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`)
- [ ] No Tailwind default palette classes are used (`blue-*`, `red-*`, `gray-*`, etc.)

### Composition Compliance (CRITICAL)

- [ ] Card surfaces in touched files match `DESIGN.md` composition recipe
- [ ] Sidebar/panel surfaces in touched files match `DESIGN.md` composition recipe
- [ ] Dialog/form/table wrappers use the semantic surface/border/text composition from `DESIGN.md`
- [ ] No primary surface remains in default primitive look when `DESIGN.md` defines explicit pattern

### Project Component Structure

- [ ] Checked `src/components/ui/` for existing UI primitives before building — reused or created one if missing
- [ ] Component is placed in the correct project folder: `ui/` → `common/` → `modules/{feature}/` → `pages/`
- [ ] UI primitives and shared components contain no API calls
- [ ] Feature modules (`modules/{feature}/`) own feature state and fetch logic where appropriate
- [ ] Pages own route-level composition and pass data down through modules/shared components as needed
- [ ] Every component exports a `className?: string` prop forwarded through `cn()`
- [ ] No upward imports — `ui` does not import from `common` or `modules`

### Accessibility

- [ ] Contrast ratio meets **WCAG AA** (minimum 4.5:1 for body text)
- [ ] All interactive elements have a visible focus state
- [ ] Icon-only buttons have ARIA labels
- [ ] Semantic HTML used throughout

### Dark Mode

- [ ] No per-component dark mode class is introduced
- [ ] All color tokens switch correctly under `.dark` without additional overrides
- [ ] (Tactical theme) Dark mode is the **default/primary** mode — design and test dark first

### Responsive

- [ ] Layout verified across all defined breakpoints
- [ ] Responsive breakpoints applied where needed (`sm:`, `md:`, `lg:`, `xl:`)
- [ ] No fixed-width elements that break at smaller viewports

### Token Conflict Resolution (`apps/`)

- [ ] No arbitrary Tailwind values (`[...]`) remain in components where a token exists
- [ ] No hardcoded hex or px values remain in `style={{}}` where a token covers the case
- [ ] All replacements have been visually verified against the design

### Styling

- [ ] No `style={{...}}` anywhere in the component — zero inline styles
- [ ] Tailwind used for all standard styling (layout, color, spacing, typography, states, responsive)
- [ ] `styled-components` used only where Tailwind falls short (complex animation, pseudo-elements, dynamic CSS-only features)
- [ ] If `styled-components` used: placed at bottom of file or in `*.styles.ts`, named descriptively

### Token Gap & Additive Compliance

- [ ] Every Tailwind class in `DESIGN.md`'s Decision Rules table exists as a `--color-*` entry in `theme.css`
- [ ] Every new CSS variable added to `variables.css` also has a `.dark {}` override (unless it's mode-invariant)
- [ ] Every new CSS variable added to `variables.css` has a corresponding Tailwind alias in `theme.css`
- [ ] No existing CSS variable was removed from `variables.css`
- [ ] No existing Tailwind alias was removed from `theme.css`

### shadcn/ui Wiring

- [ ] All shadcn internal variables (`--background`, `--foreground`, `--card`, `--popover`, `--border`, `--muted`, `--accent`, etc.) are wired in `variables.css`
- [ ] shadcn components (Button, Card, Dialog, Popover, Input) visually match the active theme — no default blue or gray leaking through
- [ ] Toggling `.dark` on `<html>` causes all shadcn components to switch correctly
- [ ] No shadcn CSS variable overrides exist inside component files

### General

- [ ] TypeScript reports zero errors (`tsc --noEmit`) in all sliced component files
- [ ] `cn()` is used for all conditional or merged className expressions
- [ ] No `!important` appears anywhere in the component tree
