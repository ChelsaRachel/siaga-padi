---
name: reactjs-modules
description: Step-by-step guide to scaffold a new module in src/modules/. A module is a self-contained reusable system with own store, fetch logic, and UI — used by 2+ features or pages. Use when creating or extending anything in src/modules/.
---

## What Belongs in `src/modules/`

A module is a **self-contained reusable system** that:

- Has its own Zustand store
- Has its own fetch / business logic
- Is used by 2+ features or pages
- Is **not** a pure UI primitive

Do NOT put here: page-specific logic, single-use components, or shadcn primitives.

---

## When to Create a Module

Before creating, verify all three conditions:

| Condition                      | Check           |
| ------------------------------ | --------------- |
| Used by 2+ features or pages   | ✅ Must be true |
| Has own state (Zustand store)  | ✅ Must be true |
| Has own fetch / business logic | ✅ Must be true |

If any condition is false → use `components/common/` (molecule) or `modules/{feature}/` (organism) instead.

---

## Available Modules

### `modules/data-display/`

General-purpose data rendering system. Supports:

- **Paginated table** mode — server-side pagination with page/size controls
- **Infinite scroll** mode — append-on-scroll via IntersectionObserver sentinel
- Inline row actions (edit, delete with confirm dialog)

**Public API** (import from barrel only):

```ts
import {
  DataDisplay, // root orchestrator component
  DataTable, // table renderer — use inside DataDisplay
  DataList, // list/card renderer — use inside DataDisplay
  RowActions, // edit/delete dropdown — use as column cell
  useDataDisplayStore, // Zustand store — read data, loading, pagination
  useDataDisplay, // hook — fetchAll, deleteById, changePage, changeSize
} from "@/modules/data-display";
```

**Module rules:**

- Always import from `@/modules/data-display` — never from internal paths.
- One `DataDisplay` instance per page — the store is module-singleton.
- `DataTable` and `DataList` must be rendered as `children` of `DataDisplay`.
- `RowActions` is used as a `ColumnDef` cell — not standalone.
- Do not access `useDataDisplayStore` directly in feature code — use the `useDataDisplay` hook.

---

## Step 1 — Scaffold the Folder Structure

```
src/modules/{name}/
├── {Name}.tsx               ← root component (skip if no UI entry point)
├── parts/                   ← sub-components used only inside this module
│   └── {Name}Item.tsx
├── hooks/
│   └── use{Name}.ts         ← logic hook: fetch, delete, actions
├── store/
│   └── use{Name}Store.ts    ← Zustand store: data, loading, pagination state
├── types/
│   └── {name}.types.ts      ← TypeScript types scoped to this module
└── index.ts                 ← barrel export — ONLY import from here externally
```

**Naming rules:**

- Folder: `kebab-case` → `data-display/`, `file-upload/`
- Root component: `PascalCase` → `DataDisplay.tsx`, `FileUpload.tsx`
- Store: `use` + `PascalCase` + `Store.ts` → `useDataDisplayStore.ts`
- Hook: `use` + `PascalCase` + `.ts` → `useDataDisplay.ts`
- Types: `camelCase` + `.types.ts` → `dataDisplay.types.ts`

---

## Step 2 — Define Types

```ts
// modules/{name}/types/{name}.types.ts
export interface T{Name}Item {
  id: string;
  // ... fields
}

export interface T{Name}State {
  data: T{Name}Item[];
  loading: boolean;
  total: number;
  page: number;
  size: number;
}
```

---

## Step 3 — Create the Zustand Store

```ts
// modules/{name}/store/use{Name}Store.ts
import { create } from 'zustand';
import type { T{Name}State, T{Name}Item } from '../types/{name}.types';

interface {Name}Store extends T{Name}State {
  setData: (data: T{Name}Item[], total: number) => void;
  setLoading: (loading: boolean) => void;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  reset: () => void;
}

const initialState: T{Name}State = {
  data: [],
  loading: false,
  total: 0,
  page: 1,
  size: 10,
};

export const use{Name}Store = create<{Name}Store>((set) => ({
  ...initialState,
  setData: (data, total) => set({ data, total }),
  setLoading: (loading) => set({ loading }),
  setPage: (page) => set({ page }),
  setSize: (size) => set({ size }),
  reset: () => set(initialState),
}));
```

---

## Step 4 — Create the Logic Hook

```ts
// modules/{name}/hooks/use{Name}.ts
import { use{Name}Store } from '../store/use{Name}Store';
import { {name}Service } from '@/services/modules/{name}.service';

export function use{Name}() {
  const { page, size, setData, setLoading } = use{Name}Store();

  const fetchAll = async (search = '') => {
    setLoading(true);
    try {
      const res = await {name}Service.getAll({ page, size, search });
      setData(res.data, res.total);
    } finally {
      setLoading(false);
    }
  };

  const deleteById = async (id: string) => {
    await {name}Service.delete(id);
    await fetchAll();
  };

  const changePage = (newPage: number) => {
    use{Name}Store.getState().setPage(newPage);
    fetchAll();
  };

  const changeSize = (newSize: number) => {
    use{Name}Store.getState().setSize(newSize);
    use{Name}Store.getState().setPage(1);
    fetchAll();
  };

  return { fetchAll, deleteById, changePage, changeSize };
}
```

---

## Step 5 — Create the Root Component (if UI exists)

```tsx
// modules/{name}/{Name}.tsx
import { useEffect } from 'react';
import { use{Name} } from './hooks/use{Name}';
import { use{Name}Store } from './store/use{Name}Store';
import { cn } from '@/utils/cn';

interface {Name}Props {
  className?: string;
}

export function {Name}({ className }: {Name}Props) {
  const { fetchAll } = use{Name}();
  const { data, loading } = use{Name}Store();

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {data.map((item) => (
        <div key={item.id} className="rounded-lg border border-border bg-card p-4">
          {/* render item */}
        </div>
      ))}
    </div>
  );
}
```

---

## Step 6 — Create the Barrel Export

```ts
// modules/{name}/index.ts
export { {Name} } from './{Name}';
export { use{Name} } from './hooks/use{Name}';
export { use{Name}Store } from './store/use{Name}Store';
export type { T{Name}Item, T{Name}State } from './types/{name}.types';
```

**Rule:** All external imports MUST use the barrel — never import from internal paths:

```ts
// ✅ Correct
import { {Name}, use{Name} } from '@/modules/{name}';

// ❌ Wrong — never import from internal path
import { use{Name} } from '@/modules/{name}/hooks/use{Name}';
```

---

## Step 7 — Register the Module

After creating the module, add an entry to the **Available Modules** section above with the module's public API and internal structure, and update the **Skills Index** / **Trigger Conditions** tables in the boilerplate's `AI_GUIDE.md` if the module introduces a new use case.

---

## Full Example — `file-preview` Module

```
src/modules/file-preview/
├── FilePreview.tsx
├── parts/
│   └── PreviewModal.tsx
├── hooks/
│   └── useFilePreview.ts
├── store/
│   └── useFilePreviewStore.ts
├── types/
│   └── filePreview.types.ts
└── index.ts
```

```ts
// index.ts
export { FilePreview } from "./FilePreview";
export { useFilePreview } from "./hooks/useFilePreview";
export { useFilePreviewStore } from "./store/useFilePreviewStore";
export type { TFilePreviewItem } from "./types/filePreview.types";
```

Usage from a page or organism:

```tsx
import { FilePreview, useFilePreview } from "@/modules/file-preview";

export function FileListPage() {
  const { open } = useFilePreview();
  return <FilePreview />;
}
```

---

## Checklist Before Marking Done

- [ ] Folder created at `src/modules/{name}/`
- [ ] `index.ts` barrel export exists — all public API exported from here
- [ ] Zustand store in `store/use{Name}Store.ts`
- [ ] Logic hook in `hooks/use{Name}.ts`
- [ ] Types in `types/{name}.types.ts`
- [ ] No direct internal path imports anywhere in the codebase
- [ ] **Available Modules** section above updated with the new module entry
- [ ] Orchestra index trigger table updated if a new use case applies
