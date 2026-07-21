---
name: reactjs-menu-config
description: Reference for all application menu definitions (APP_MENU, ADMINISTRATOR_MENU, MANAGER_MENU). Load when adding, removing, or modifying menu items, checking existing menu IDs, wiring sidebar/header navigation, or wiring up route paths.
---

# Menu Config Skill

Load this file whenever you need to:
- Add a new menu item to `APP_MENU`, `ADMINISTRATOR_MENU`, or `MANAGER_MENU`
- Check if a menu `id` or `idParent` already exists
- Verify which path a menu maps to
- Add or change privileges on a menu entry
- Render sidebar/header navigation from config

## File Location

```
src/config/menu/
├── app.menu.ts             ← APP_MENU for primary app navigation
├── administrator.menu.ts   ← ADMINISTRATOR_MENU and role-gated admin menus
└── index.ts                ← ALL_MENUS() aggregation
```

Always read the actual file before modifying it. The ID Quick Reference below is a snapshot — verify against the live source before generating new IDs.

## Rules When Modifying Menus

- Each `id` must be unique across **all** menu arrays (`APP_MENU`, `ADMINISTRATOR_MENU`, `MANAGER_MENU` if present)
- `idParent` must match an existing `id` in the same array, or `''` for top-level items
- `path` must match a registered route in `src/routes/`
- `privileges` values use `snake_case` (e.g. `create_update`, `view-all`)
- Generate new IDs as short random alphanumeric strings (5–7 chars) — never duplicate an existing ID
- `privileges: null` only if the menu intentionally has no access control
- Layout components must not hardcode navigation item arrays. Add/edit items in `src/config/menu/*` and render from config.

## Workflow

1. **Read** all files under `src/config/menu/` — get the live source
2. **Check IDs** in the Quick Reference below — pick a new unique 5–7 char alphanumeric ID
3. **Write** the entry using the correct shape (standard or tactical)
4. **Verify** the `path` exists in `src/routes/` before saving

## Rendering Rules

- `AppSidebar` renders from `APP_MENU` for primary application navigation.
- Admin-only sidebars render from `ADMINISTRATOR_MENU`.
- Shared search/permission systems can use `ALL_MENUS()`.
- Never create local arrays such as `const menuItems = [...]` inside `AppSidebar`, `AppHeader`, or layout components.
- Icons must be config-driven via `icon` and `additional.iconType` / `additional.iconStyle`; render them with `renderIcon()`.

## Entry Shape

**Standard menu:**
```typescript
{
  id: 'abc12',          // unique 5-7 char alphanumeric
  idParent: '',         // '' = top-level, or matching parent id
  display: 'Label',
  name: 'route-name',
  path: '/route/path',  // must exist in src/routes/
  show: true,
  search: true,
  enabled: true,
  group: 'data',        // 'data' | 'system' | 'organization' | 'workspace' | 'application'
  type: 'menu',
  icon: 'iconName',
  seo: { title: 'Label', description: '' },
  privileges: [
    { label: 'View', value: 'view', description: '...', type: 'administrator' },
    { label: 'Create & Update', value: 'create_update', description: '...', type: 'administrator' },
    { label: 'Delete', value: 'delete', description: '...', type: 'administrator' },
  ],
}
```

**Tactical menu** — add `tactical: true` and optional `additional` block:
```typescript
{
  // ...same base fields as standard...
  tactical: true,
  additional: {
    container: 'boxed',
    iconType: 'phosphor',
    iconStyle: 'regular',
    iconStyleActive: 'regular',
    mainPage: false,
    enableIframe: false,
    iframeUrl: '',
    iconCode: 'E6F6',      // phosphor icon hex code
    bgIcon: '',
    path: '',
    menuBgColorTheme: 'primary',
    redirectTo: '',
  },
}
```

Tactical menus are standalone top-level items (`idParent: ''`) used outside the main `Administrator` group. Examples: `officer`, `offender-registry`, `program-assignment`, `team`, `member`.

## ID Quick Reference

### ADMINISTRATOR_MENU — Top-level (`idParent: ''`)
| id | display | path |
|----|---------|------|
| `vgoif` | Licenses | `/about/licences` |
| `qeuln` | Administrator | `/administrator` |
| `officer` | Officer | `/administrator/officer` |
| `a62da` | Devices | `/administrator/device` |
| `offender-registry` | Offender Registry | `/administrator/offender-registry` |
| `program-assignment` | Program Assignment | `/administrator/program-assignment` |
| `aga7js` | Team | `/administrator/team` |
| `hs45k2` | Member | `/administrator/member` |
| `xkqwe` | Case Type | `/administrator/case-type` |
| `7hsda` | Poi | `/administrator/poi` |
| `akjss` | Marker | `/administrator/marker` |
| `asfac` | Catalog | `/administrator/catalog` |

### ADMINISTRATOR_MENU — Children of `qeuln`
| id | display | path |
|----|---------|------|
| `ne5zz` | Topic | `/administrator/topic` |
| `ljshed` | Account Management | `/administrator/sc-account` |
| `2gg7b` | Topic Comparison | `/administrator/topic-comparison` |
| `bq2as` | Indicator | `/administrator/indicator` |
| `bd5ks` | Survey Management | `/administrator/survey-management` |
| `4sbm5a` | User | `/administrator/user` |
| `4sbm5` | User Activity | `/administrator/user-activity` |
| `znhzx` | Role | `/administrator/role` |
| `36uhy` | Group | `/administrator/group` |
| `rjer3` | Connection | `/administrator/connection` |
| `ns306` | Connection Group | `/administrator/connection-group` |
| `c7eic` | Permission | `/administrator/permission` |
| `seypi` | Workspace | `/administrator/workspace` |
| `hckwq` | Workspace Settings | `/administrator/workspace-settings` |
| `joskkeq` | Organization | `/administrator/organization` |
| `joskke` | Organization Member | `/administrator/organization-member` |
| `xdvad` | System Settings | `/administrator/system-settings` |

### MANAGER_MENU — Top-level
| id | display | group | path |
|----|---------|-------|------|
| `a7f3d` | Organizations | organization | `/organization` |
| `02no1` | My Profile | organization | `/settings/profile` |
| `xbzpn` | Plugins | organization | `/plugins` |
| `ryvow` | Build | organization | `/build` |
| `aksdj` | Management Data | organization | `/management/data` |
| `dvfjb` | AI Tools | organization | `/ai` |
| `nonca1` | Workspaces | workspace | `/<cwd>/members` |
| `nonca` | Workspaces Members | workspace | `/<cwd>/members` |
| `ygxrt` | Application | workspace | `/apps` |
| `rdtzv` | Visualization | workspace | `/visualization` |
| `4om4y` | Applications | application | `/apps` |

### MANAGER_MENU — Children of `a7f3d` (Organizations)
| id | display | path |
|----|---------|------|
| `g1n2r` | General | `/settings/organization/general` |
| `af23g` | Workspace | `/settings/organization/workspace` |
| `12afs` | Application | `/settings/organization/apps` |
| `v63ro` | Member | `/settings/organization/member-list` |
| `e5h8j` | Role | `/settings/organization/role-management` |
| `k2l7m` | Group | `/settings/organization/group-management` |
| `68knd` | Client | `/settings/organization/client` |
| `c9d6f` | Percolator | `/settings/organization/percolator` |
| `h7t9y` | History | `/settings/organization/history` |

### MANAGER_MENU — Children of `xbzpn` (Plugins)
| id | display | path |
|----|---------|------|
| `kjunv` | AI Assistant | `/plugins/ai-assistant` |
| `vpikf` | Map | `/plugins/maps` |
| `gbais` | Network Graph | `/plugins/network` |
| `sfdoh` | Data Manager | `/plugins/data-manager` |

### MANAGER_MENU — Children of `ryvow` (Build)
| id | display | path |
|----|---------|------|
| `eqmyi` | Connection | `/build/connection` |
| `olsqg` | Sources | `/build/data-source` |
| `cnrcl` | Query Catalog | `/build/query-catalog` |
| `ihuml` | API Gateway | `/build/api` |
| `gypan` | Icons | `/build/icons` |
| `bxtebq` | Color Palette | `/build/color-palette` |
| `uqgfg` | Topic Management | `/build/topic-management` |
| `pegtl` | Comparison | `/build/comparison` |
| `bxteb` | Indicator | `/build/indicator` |
| `ibdft` | Catalog Socmed Account | `/build/catalog-socmed-account` |
| `5dxob` | Hook Management | `/build/hook-management` |

### MANAGER_MENU — Children of `dvfjb` (AI Tools)
| id | display | path |
|----|---------|------|
| `je87x` | Stellar Client Config | `/ai/stellar-client-config` |
| `jelgx` | AI Mode | `/ai/ai-mode` |
| `jegxw` | Ai Tools & Extensions | `/ai/assistant-features` |
| `hzkvf` | AI Style | `/ai/ai-style` |
| `tlhvh` | AI Persona | `/ai/persona` |
| `kelgx` | Database | `/ai/database` |
| `jlmnx` | API Endpoint | `/ai/api-endpoint` |
| `csgsc` | QnA Reporter | `/ai/reporter` |
| `nqavo` | Feedback Manager | `/ai/feedback-manager` |

### MANAGER_MENU — Children of `aksdj` (Management Data)
| id | display | path |
|----|---------|------|
| `otkde` | Computer Vision | `/management/data/cctv` |
