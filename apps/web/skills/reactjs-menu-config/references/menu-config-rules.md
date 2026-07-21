# Menu Config — Rules & Constraints

## File Location

```
src/config/menu/
└── administrator.menu.ts   ← single source of truth for all menus
```

**Rule:** All menu definitions live in one file. Never split menus across multiple files.

---

## Required Rules

### 1. Unique IDs

- Every menu entry **must** have a globally unique `id` across **both** `ADMINISTRATOR_MENU` and `MANAGER_MENU`
- Generate a random alphanumeric string of **5–7 characters** (e.g. `ne5zz`, `a62da`)
- **Always** check the ID reference table in `skills/reactjs-menu-config/SKILL.md` before picking a new ID

```ts
// ✅ Correct — unique, short, random
{ id: 'xk9qp', ... }

// ❌ Wrong — descriptive/semantic IDs collide and leak intent
{ id: 'admin-user-menu', ... }
{ id: 'user', ... }
```

### 2. Parent–Child Relationships (`idParent`)

- Top-level items: `idParent: ''`
- Children: `idParent` must match an **existing** `id` in the **same array**
- Never reference an `id` from `ADMINISTRATOR_MENU` as `idParent` in `MANAGER_MENU`, or vice versa

```ts
// ✅ Correct — child of 'qeuln' which exists in ADMINISTRATOR_MENU
{ id: 'ne5zz', idParent: 'qeuln', ... }

// ❌ Wrong — 'qeuln' does not exist in MANAGER_MENU
// (in MANAGER_MENU) { id: 'x1y2z', idParent: 'qeuln', ... }
```

### 3. Route Paths

- `path` must correspond to a **registered route** in `src/routes/`
- Never add a menu item for a route that does not exist yet
- If adding both a route and a menu at the same time, define the route first

```ts
// ✅ Correct — route exists in src/routes/admin.routes.tsx
{ path: '/administrator/user', ... }

// ❌ Wrong — route not registered anywhere
{ path: '/administrator/some-future-page', ... }
```

### 4. Privilege Values

- `value` fields use `snake_case` for compound actions: `create_update`, `view-all`
- `type` field must be `'administrator'` for `ADMINISTRATOR_MENU` entries
- `privileges: null` is only allowed when the menu intentionally has **no access control**
- `privileges: []` means the item is a **group/parent** container with no direct privileges

```ts
// ✅ Correct privilege shapes
privileges: [
  { label: 'View', value: 'view', description: '...', type: 'administrator' },
  { label: 'Create & Update', value: 'create_update', description: '...', type: 'administrator' },
  { label: 'Delete', value: 'delete', description: '...', type: 'administrator' },
]

// ✅ Group container — no privileges
privileges: []

// ✅ No access control — intentional
privileges: null

// ❌ Wrong — camelCase value
{ value: 'createUpdate', ... }

// ❌ Wrong — missing type field in ADMINISTRATOR_MENU
{ label: 'View', value: 'view', description: '...' }
```

### 5. Required Fields

Every menu entry **must** have all of the following fields:

| Field        | Type                     | Notes                                                                           |
| ------------ | ------------------------ | ------------------------------------------------------------------------------- |
| `id`         | `string`                 | Unique, 5–7 char alphanumeric                                                   |
| `idParent`   | `string`                 | `''` for top-level, or matching parent `id`                                     |
| `display`    | `string`                 | Human-readable label                                                            |
| `name`       | `string`                 | `camelCase` or `kebab-case` identifier                                          |
| `path`       | `string`                 | Must be a registered route                                                      |
| `show`       | `boolean`                | Controls sidebar/nav visibility                                                 |
| `search`     | `boolean`                | Controls searchability                                                          |
| `enabled`    | `boolean`                | Toggles the menu on/off                                                         |
| `group`      | `string`                 | Logical grouping (`data`, `system`, `organization`, `workspace`, `application`) |
| `type`       | `string`                 | Always `'menu'`                                                                 |
| `icon`       | `string`                 | Phosphor icon slug — kebab-case (e.g. `house`, `chart-line-up`)                 |
| `seo`        | `{ title, description }` | Required even if description is empty                                           |
| `privileges` | `IPrivilege[] \| null`   | See Rule 4                                                                      |
| `additional` | `IMenuAdditional`        | Required for all nav/sidebar menus — see Rule 7                                 |

### 6. `additional` Field (Required for nav and sidebar menus)

Every menu item rendered in `AppHeader` nav tabs or sidebar **must** include `additional`:

```ts
additional: {
  container: 'full',        // 'boxed' | 'full' | 'fluid' — layout container type
  iconType: 'phosphor',     // 'phosphor' | 'svg-code' — always 'phosphor' unless custom SVG
  iconStyle: 'regular',     // Phosphor weight for default/inactive state
  iconStyleActive: 'fill',  // Phosphor weight when item is active
  mainPage: false,          // true only for the primary landing page (one per app)
  redirectToEnabled: false, // enable redirect instead of direct navigation
  redirectTo: '',           // redirect path — only used when redirectToEnabled is true
}
```

**Rules:**

- `iconType` must be `'phosphor'` for all standard icons — only `'svg-code'` for custom brand icons
- `iconStyle` and `iconStyleActive` must be valid Phosphor weight strings: `'regular' | 'fill' | 'bold' | 'light' | 'duotone'`
- Only one menu per array may have `mainPage: true`
- `additional` may be omitted only for pure group containers (`privileges: []`) that are never rendered directly

```ts
// ✅ Correct — nav tab with full additional
{
  id: 'k7fhp',
  icon: 'clock-countdown',
  additional: {
    container: 'full',
    iconType: 'phosphor',
    iconStyle: 'regular',
    iconStyleActive: 'fill',
    mainPage: true,
    redirectToEnabled: false,
    redirectTo: '',
  },
}

// ❌ Wrong — missing additional on a rendered nav item
{
  id: 'k7fhp',
  icon: 'clock-countdown',
  // no additional field
}

// ❌ Wrong — invalid iconType
additional: { iconType: 'lucide', ... }

// ❌ Wrong — invalid weight value
additional: { iconStyle: 'solid', ... }
```

### 7. `tactical` Field

- Only add `tactical: true` for menus that belong to a tactical/operational context (e.g. Officer, Devices, Poi, Marker)
- Tactical menus also require an `additional` object with the full shape:

```ts
additional: {
  container: 'boxed',
  iconType: 'phosphor',
  iconStyle: 'regular',
  iconStyleActive: 'regular',
  mainPage: false,
  enableIframe: false,
  iframeUrl: '',
  iconCode: '',       // phosphor icon hex code
  bgIcon: '',
  path: '',
  menuBgColorTheme: 'primary',
  redirectTo: '',
}
```

### 8. `ALL_MENUS` Export

- `ALL_MENUS` is a **function** — always call it as `ALL_MENUS()`, never access it as a plain array
- Never modify the `ALL_MENUS` definition itself — it always spreads both arrays

```ts
// ✅ Correct
const menus = ALL_MENUS();

// ❌ Wrong — treating it as a value, not a function
const menus = ALL_MENUS;
```

### 9. Commented-Out Entries

- Commented-out menu items are **intentionally disabled** — do not uncomment them without explicit instruction
- When disabling a menu, comment it out in place rather than deleting it (preserves history and re-enable path)

---

## Do & Don't Summary

|                        | Do ✅                                                                 | Don't ❌                              |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| ID                     | Short random alphanumeric (`xk9qp`)                                   | Semantic/descriptive (`admin-user`)   |
| `idParent`             | Match existing `id` in same array                                     | Reference across arrays               |
| `path`                 | Registered route only                                                 | Unregistered or future path           |
| `icon`                 | Phosphor slug kebab-case (`chart-line-up`)                            | React component name (`ChartLineUp`)  |
| `additional`           | Present on all rendered nav/sidebar menus                             | Omit on rendered items                |
| `additional.iconType`  | `'phosphor'` or `'svg-code'`                                          | `'lucide'` or any other value         |
| `additional.iconStyle` | Valid Phosphor weight (`regular`, `fill`, `bold`, `light`, `duotone`) | Arbitrary string (`solid`, `outline`) |
| `additional.mainPage`  | `true` on exactly one item per array                                  | Multiple `true` in same array         |
| Privileges             | `snake_case` values, `type: 'administrator'`                          | `camelCase`, missing `type`           |
| `ALL_MENUS`            | Call as `ALL_MENUS()`                                                 | Use as `ALL_MENUS`                    |
| Disabled menus         | Comment out in place                                                  | Delete outright                       |

---

## Definition of Done

A menu change is complete only when **all** of the following are verified:

- [ ] New `id` is unique across all menu arrays (checked against skill ID table)
- [ ] `idParent` is `''` or matches an existing `id` in the **same** array
- [ ] `path` corresponds to a registered route in `src/routes/`
- [ ] All required fields are present and correctly typed
- [ ] `icon` is a Phosphor slug in kebab-case
- [ ] `additional` is present on all rendered nav/sidebar items
- [ ] `additional.iconType` is `'phosphor'` or `'svg-code'`
- [ ] `additional.iconStyle` and `iconStyleActive` are valid Phosphor weight strings
- [ ] At most one item per array has `additional.mainPage: true`
- [ ] `privileges` values use correct casing (`snake_case` / `view-all`)
- [ ] `type: 'administrator'` is set on each privilege in `ADMINISTRATOR_MENU`
- [ ] No previously commented-out menu was uncommented without explicit instruction
- [ ] `ALL_MENUS` export is untouched (still spreads all arrays)
- [ ] Skill ID reference table in `skills/reactjs-menu-config/SKILL.md` is updated if a new ID was added
