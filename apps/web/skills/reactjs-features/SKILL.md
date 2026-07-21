---
name: reactjs-features
description: Use when creating or scaffolding a business domain feature folder under src/features/. Walks through deciding if a feature is needed, choosing the right domain bucket (shared vs domain-specific), scaffolding the folder, writing the store, hook, and barrel export.
---

# Skill: Scaffolding a Feature

A feature is a self-contained business domain. This skill guides you from decision to working scaffold in 5 steps.

---

## Domain-Based Feature Grouping

Features in `src/features/` are organized by domain. **Always decide where the feature belongs before scaffolding.**

```
src/features/
├── shared/          ← reusable across 2+ unrelated domains (but NOT generic enough for modules/)
│   ├── auth/
│   └── notification/
├── {domain}/        ← features used only within one business domain
│   ├── dashboard/
│   │   ├── analytics/
│   │   └── kpi/
│   ├── billing/
│   │   └── invoice/
│   └── settings/
│       └── profile/
└── ...
```

### Placement rule

| Condition | Where |
|-----------|-------|
| Used by exactly **one page** | `pages/{page}/parts/` + `pages/{page}/hooks/` — NOT in `features/` |
| Used **only within one domain** (even if across 2+ pages in that domain) | `features/{domain}/{feature}/` |
| Used across **2+ unrelated domains** but is domain-aware (not a generic system) | `features/shared/{feature}/` |
| Fully generic system, domain-agnostic, used by 2+ features/pages | `modules/` — see [reactjs-modules/SKILL.md](../reactjs-modules/SKILL.md) |

> **Shared vs Modules:** `features/shared/` is for domain-aware cross-cutting features (e.g. `auth`, `notification` — they carry business meaning). `modules/` is for purely generic, domain-agnostic systems (e.g. `data-display`, `file-preview`).

---

## Step 1 — Decide if a feature folder is needed

```
Does the domain logic...
  ├─ Span 2+ pages?                    → YES → use features/
  ├─ Have its own Zustand state?       → YES → use features/
  ├─ Have shared components/hooks
  │  used across pages?                → YES → use features/
  └─ Live only on one page?            → NO  → use pages/{page}/parts/ and pages/{page}/hooks/
```

If only one page uses it, do NOT create a feature folder. Co-locate in the page instead.

## Step 1b — Decide the domain bucket

```
Is this feature used across 2+ unrelated domains?
  ├─ YES → features/shared/{feature}/
  └─ NO  → features/{domain}/{feature}/
             (domain = the business area: billing, dashboard, settings, etc.)
```

---

## Step 2 — Scaffold the folder

Path is determined by the domain bucket from Step 1b:

- Domain-specific: `src/features/{domain}/{name}/`
- Shared (cross-domain): `src/features/shared/{name}/`

Minimal scaffold (no service layer):

```
src/features/{domain}/{name}/     ← or features/shared/{name}/ for shared
├── components/
│   └── {Name}Card.tsx        ← or whatever the primary UI is
├── hooks/
│   └── use{Name}.ts
├── store/
│   └── use{Name}Store.ts
├── types/
│   └── {name}.types.ts
└── index.ts
```

With service layer (when domain has complex API logic):

```
src/features/{domain}/{name}/
├── components/
├── hooks/
├── store/
├── types/
├── services/
│   └── {name}.service.ts
└── index.ts
```

---

## Step 3 — Implement each layer

Example: `features/storage/file-upload/` (domain = `storage`, feature = `file-upload`)

### Types first

```ts
// src/features/storage/file-upload/types/file-upload.types.ts
export interface TUploadedFile {
  id: string
  name: string
  url: string
  size: number
  mimeType: string
  uploadedAt: string
}

export interface TUploadPayload {
  file: File
  folderId?: string
}
```

### Store

```ts
// src/features/storage/file-upload/store/useFileUploadStore.ts
import { create } from 'zustand'
import type { TUploadedFile } from '../types/file-upload.types'

interface FileUploadState {
  uploading: boolean
  progress: number
  recentFiles: TUploadedFile[]
  setUploading: (v: boolean) => void
  setProgress: (v: number) => void
  addFile: (file: TUploadedFile) => void
  reset: () => void
}

export const useFileUploadStore = create<FileUploadState>((set) => ({
  uploading: false,
  progress: 0,
  recentFiles: [],
  setUploading: (uploading) => set({ uploading }),
  setProgress: (progress) => set({ progress }),
  addFile: (file) => set((s) => ({ recentFiles: [file, ...s.recentFiles] })),
  reset: () => set({ uploading: false, progress: 0 }),
}))
```

### Hook

```ts
// src/features/storage/file-upload/hooks/useFileUpload.ts
import { createResourceService } from '@/services/resource.service'
import { useFileUploadStore } from '../store/useFileUploadStore'
import type { TUploadPayload } from '../types/file-upload.types'

const service = createResourceService('/files')

export function useFileUpload() {
  const { setUploading, setProgress, addFile, reset } = useFileUploadStore()

  async function upload({ file, folderId }: TUploadPayload) {
    setUploading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (folderId) formData.append('folderId', folderId)
      const res = await service.add(formData)
      if (res?.data) addFile(res.data)
      return res
    } finally {
      reset()
    }
  }

  return { upload }
}
```

### Component

```tsx
// src/features/storage/file-upload/components/UploadButton.tsx
import { Button } from '@/components/ui/button'
import { useFileUpload } from '../hooks/useFileUpload'
import { useFileUploadStore } from '../store/useFileUploadStore'

export function UploadButton() {
  const { upload } = useFileUpload()
  const { uploading, progress } = useFileUploadStore()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload({ file })
  }

  return (
    <Button asChild disabled={uploading}>
      <label>
        {uploading ? `Uploading ${progress}%` : 'Upload File'}
        <input type="file" className="hidden" onChange={handleChange} />
      </label>
    </Button>
  )
}
```

### Barrel export

```ts
// src/features/storage/file-upload/index.ts
export { UploadButton } from './components/UploadButton'
export { useFileUpload } from './hooks/useFileUpload'
export { useFileUploadStore } from './store/useFileUploadStore'
export type { TUploadedFile, TUploadPayload } from './types/file-upload.types'
```

---

## Step 4 — Use in a page

```tsx
// src/pages/storage/StoragePage.tsx
import { UploadButton, useFileUploadStore } from '@/features/storage/file-upload'

export function StoragePage() {
  const { recentFiles } = useFileUploadStore()

  return (
    <div>
      <UploadButton />
      <ul>
        {recentFiles.map((f) => (
          <li key={f.id}>{f.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

Pages import ONLY from the barrel — never from internal paths.

## Step 4b — If the feature becomes a route

If the work introduces a route-level page, feature scaffolding is only one part of the job.

Before considering the task complete:

1. Load `app-layout/SKILL.md` and register the page in `src/routes/`.
2. If the page is user-facing and reachable from application navigation, load `menu-config/SKILL.md` and add the menu entry in `src/config/menu/*`.
3. Only skip menu wiring when the prompt/task explicitly says the route is hidden, redirect-only, modal-only, callback-only, or otherwise non-navigable.

Do not assume "feature created" means "done" if the user asked for an actual page/screen.

---

## Common Feature Examples

| Feature path | Domain bucket | Store holds | Primary hook | Primary component |
|-------------|--------------|------------|--------------|------------------|
| `features/shared/auth/` | shared | `currentUser`, `token`, `isAuthenticated` | `useAuth` | `LoginForm` |
| `features/shared/notification/` | shared | `notifications`, `unreadCount` | `useNotification` | `NotificationBell` |
| `features/dashboard/analytics/` | dashboard | `metrics`, `range`, `loading` | `useAnalytics` | `AnalyticsPanel` |
| `features/billing/invoice/` | billing | `invoices`, `plan`, `usage` | `useBilling` | `InvoiceList` |
| `features/settings/profile/` | settings | `profile`, `saving` | `useProfile` | `ProfileForm` |
| `features/storage/file-upload/` | storage | `uploading`, `progress`, `recentFiles` | `useFileUpload` | `UploadButton` |

---

## ✅ Do

- ✅ Decide domain bucket first (Step 1b) before touching any file
- ✅ Create `index.ts` before writing any code — define the public API first
- ✅ Types first, then store, then hooks, then components
- ✅ Import the feature in pages only via `@/features/{domain}/{name}` or `@/features/shared/{name}`
- ✅ Keep the feature store scoped — only domain data, not global app state
- ✅ Use `src/services/resource.service` inside feature hooks — not directly in components
- ✅ If the feature introduces a route/page, wire the route before closing the task
- ✅ If the route is user-facing, add the matching menu entry unless the task explicitly says it is hidden

## ❌ Don't

- ❌ Don't scaffold at `src/features/{name}/` flat root — always nest under a domain or `shared/`
- ❌ Don't create a feature for logic used by exactly one page
- ❌ Don't cross-import between domain features (e.g. `features/billing/...` → `features/dashboard/...`)
- ❌ Don't skip `index.ts` — pages must never reach into internal feature paths
- ❌ Don't put fetch logic inside feature components — use a hook
- ❌ Don't place domain types in `src/types/` if they're only used inside this feature
- ❌ Don't put a generic reusable system in `features/shared/` — use `modules/` instead
- ❌ Don't stop at scaffolding if the user asked for a page that must be reachable in the app

---

## Verification Checklist

- [ ] Domain bucket decided: `features/shared/` or `features/{domain}/`
- [ ] Feature folder is `kebab-case` nested under the correct bucket
- [ ] `index.ts` exists and lists all public exports explicitly
- [ ] Types defined in `features/{domain}/{name}/types/` — not in `src/types/`
- [ ] Store owns only domain data — no global app state inside feature store
- [ ] Hook contains all fetch/mutation logic — components are presentational
- [ ] Pages import only via `@/features/{domain}/{name}` barrel — no internal path imports
- [ ] No cross-domain feature imports — shared data goes through `src/stores/` or `features/shared/`
- [ ] If the feature created a route-level page, that page is wired in `src/routes/`
- [ ] If the page is user-facing, a menu entry exists in `src/config/menu/*` or the task explicitly documents why it is hidden

---

## Rules & Constraints

### What is a Feature

A feature is a **business domain unit** that:
- Spans 2+ pages or involves significant shared logic within its domain
- Has its own state (Zustand slice) tied to domain data
- Has components and hooks that only make sense within that domain
- Is too large or too opinionated to live in `components/` or `modules/`

**Domain-specific examples:** `features/billing/invoice/`, `features/dashboard/analytics/`, `features/settings/profile/`

**Shared examples:** `features/shared/auth/`, `features/shared/notification/` — domain-aware but used across multiple domains

### Barrel Export Constraints

- Only export what other parts of the app are allowed to use
- Do NOT re-export internal implementation details

### Feature vs Other Folders

| Code | Where | Condition |
|------|-------|-----------|
| Button, Input, Badge | `components/ui/` | UI primitive, no domain knowledge |
| AppLayout, Sidebar | `components/layouts/` | App shell structure |
| EChartWrapper, MapboxWrapper | `components/wrappers/` | 3rd-party lib adapter |
| DataDisplay, DataTable | `modules/data-display/` | Generic reusable system, domain-agnostic, used by 2+ features |
| LoginForm, useAuth | `features/shared/auth/` | Domain-aware, used across 2+ unrelated domains |
| NotificationBell, useNotification | `features/shared/notification/` | Domain-aware, used across 2+ unrelated domains |
| InvoiceList, useBilling | `features/billing/invoice/` | Only used within billing domain |
| AnalyticsPanel, useAnalytics | `features/dashboard/analytics/` | Only used within dashboard domain |
| StatsPanel (dashboard only, one page) | `pages/dashboard/parts/` | Used by exactly one page — not a feature |
| useUserList (used 2+ pages) | `src/hooks/` | Global hook, no domain ownership |
| JWT token, session state | `src/stores/` | Cross-feature global state |

### Definition of Done

- [ ] Domain bucket decided and feature nested under `features/{domain}/` or `features/shared/`
- [ ] `index.ts` barrel exists and lists all public exports
- [ ] No other feature imports from this feature's internal paths
- [ ] No cross-domain feature imports — shared data goes through `src/stores/` or `features/shared/`
- [ ] Feature store owns only domain data, not global app state
- [ ] Pages using this feature import only from `@/features/{domain}/{name}` barrel
- [ ] Types used only inside the feature are in `features/{domain}/{name}/types/`, not `src/types/`
- [ ] Any new route/page created by this feature is registered
- [ ] Any new user-facing route/page created by this feature is also wired to menu config unless explicitly hidden
