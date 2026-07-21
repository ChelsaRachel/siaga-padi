---
name: data-display
description: Use when rendering data lists, tables, or paginated results. Covers DataDisplay, DataList, DataTable, infinite scroll, and pagination modes. Trigger: list, table, grid, cards, scroll, pagination.
---

# Skill: Rendering Server Data with DataDisplay

Compose a page in three steps. Never reinvent fetch/pagination/scroll.

---



## Step 1 — Pick the mode

```
Is the data tabular with fixed columns?
  YES → DataTable mode (paginated by default)
  NO  → DataList mode
        ├─ Long feed, auto-load more? → infiniteScroll + scrollable
        └─ Discrete pages?            → default paginated
```

---

## Step 2 — Memoize params

```tsx
// ✅ Stable reference
const [params] = useState({ workspaceId, orderBy: 'updatedAt', order: 'desc' });

// ❌ New object every render → infinite refetch
<DataDisplay params={{ workspaceId, orderBy: 'updatedAt' }} />
```

---

## Step 3 — Compose

### A. Table

```tsx
<DataDisplay
  endpoint={API_ENDPOINTS.PRODUCT.BASE}
  params={params}
  itemPerPage={25}
  actions={{ edit: true, delete: true }}
  onEdit={(row) => openEditDialog(row)}
>
  <DataTable columns={columns} dataRows={rows} />
</DataDisplay>
```

### B. Paginated list/cards

```tsx
<DataDisplay endpoint={...} params={params} itemPerPage={20}>
  <DataList>
    <ul className="grid grid-cols-3 gap-4">
      {rows.map((row) => <ProductCard key={row.id} row={row} />)}
    </ul>
  </DataList>
</DataDisplay>
```

### C. Infinite scroll list

```tsx
<div className="fixed inset-0 flex justify-center overflow-hidden py-8">
  <div className="flex flex-col w-full max-w-2xl h-full">
    <DataDisplay
      endpoint={API_ENDPOINTS.PRODUCT.BASE}
      params={params}
      itemPerPage={50}
      infiniteScroll
    >
      <DataList scrollable className="flex-1 min-h-0">
        <ul className="flex flex-col gap-2 px-5 pt-5">
          {rows.map((row) => <ProductCard key={row.id} row={row} />)}
        </ul>
      </DataList>
    </DataDisplay>
  </div>
</div>
```

> Reading rows inside a child:
> ```tsx
> const { data } = useDataDisplayStore();
> const rows = data as IProduct[];
> ```

### D. With extra filter params + custom page size

```tsx
<DataDisplay
  endpoint="/documents/get-all"
  params={params}
  defaultPageSize={25}
  pageSizeOptions={[25, 50, 100]}
>
  <DataTable columns={columns} dataRows={rows} />
</DataDisplay>
```

`params` re-triggers fetch automatically when values change (memoize with `useState`/`useMemo`).

---

---

## DataDisplay Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `endpoint` | `string` | required | API path — passed to `createResourceService` |
| `children` | `ReactNode` | required | `DataTable` or `DataList` |
| `params` | `Record<string, unknown>` | `{}` | Extra query params merged into FindDTO — must be memoized |
| `actions.edit` | `boolean` | `false` | Enable edit action in `RowActions` |
| `actions.delete` | `boolean` | `false` | Enable delete action with confirm dialog |
| `onEdit` | `(row) => void` | — | Callback when edit is triggered |
| `infiniteScroll` | `boolean` | `false` | Switch to infinite scroll mode |
| `pagination` | `boolean` | `true` | Show/hide pagination controls |
| `itemPerPage` | `number` | `10` | Initial page size |
| `defaultPageSize` | `number` | — | Override initial page size |
| `pageSizeOptions` | `number[]` | `[10,25,50,100]` | Options in page size selector |
| `totalData` | `number` | — | Total count if known externally |

## DataList Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scrollable` | `boolean` | `false` | Enable scroll container + infinite trigger |
| `className` | `string` | — | Applied to wrapper div |
| `children` | `ReactNode` | — | Rendered when data is available |

`DataList` handles loading/error/empty states automatically.
In `scrollable` mode, triggers `fetchNext` when scroll reaches 80px from bottom.

## RowActions

Renders an icon button with a dropdown. Reads `onEditRequest` / `onDeleteRequest` from store.
Renders nothing if neither `actions.edit` nor `actions.delete` is set on `DataDisplay`.

```tsx
// Use as a ColumnDef cell — not standalone
{
  id: 'actions',
  cell: ({ row }) => <RowActions row={row.original} />,
}
```

---

## ✅ Do

- ✅ Use `<DataDisplay>` for **any** server-data list/table — no exceptions.
- ✅ Stabilize `params` with `useState` / `useMemo`.
- ✅ For infinite scroll: combine `infiniteScroll` (DataDisplay) + `scrollable` (DataList) + `flex-1 min-h-0`.
- ✅ Anchor full-height scroll containers with `fixed inset-0` on the page wrapper.
- ✅ Read rows from `useDataDisplayStore()` inside child render components.
- ✅ Use `actions={{ edit, delete }}` + `onEdit` callback for row actions.

## ❌ Don't

- ❌ Don't call the service directly from the page's `useEffect`.
- ❌ Don't pass an inline object to `params`.
- ❌ Don't combine `infiniteScroll` and `pagination` in one `<DataDisplay>`.
- ❌ Don't use `IntersectionObserver` against the viewport — built-in handles this.
- ❌ Don't hardcode `h-[calc(100vh-Xrem)]` on the scrollable container.
- ❌ Don't add `overflow: hidden` to `body`/`html` to fix double scrollbars.
- ❌ Don't write your own pagination UI inside the page.
- ❌ Don't mutate `useDataDisplayStore` from a child component.

---

## Verification Checklist

- [ ] `<DataDisplay>` wraps the data UI; no parallel fetch in the page
- [ ] `params` is memoized
- [ ] Mode is correct: `infiniteScroll` XOR paginated, not both
- [ ] For infinite scroll: `DataList scrollable` + `flex-1 min-h-0` inside a bounded flex parent
- [ ] Page wrapper uses `fixed inset-0` (or other bounded container) when needed
- [ ] Edit/Delete handled via `actions` + `onEdit` — no custom row buttons
- [ ] No global CSS modifications

---

## Rules & Constraints

### Component Map

```
src/modules/data-display/
├── DataDisplay.tsx                     ← Wrapper: fetch + actions + delete dialog
├── RowActions.tsx                      ← Edit/Delete kebab menu
├── index.ts                            ← Public exports
├── parts/
│   ├── DataTable.tsx                   ← Table view (TanStack Table)
│   └── DataList.tsx                    ← List/card view, optional scrollable
├── hooks/
│   ├── useDataDisplay.ts               ← Paginated fetch loop
│   └── useInfiniteScroll.ts            ← Infinite scroll fetch loop
└── store/useDataDisplayStore.ts        ← Shared state (data, pagination, loading, error)
```

### When to Use Which Part

| Scenario                           | Component / Mode                           |
| ---------------------------------- | ------------------------------------------ |
| Tabular data, fixed columns        | `<DataTable>`                              |
| Cards / list items, custom layout  | `<DataList>` (no `scrollable`)             |
| Long feed, infinite-load on scroll | `<DataList scrollable>` + `infiniteScroll` |
| Manual page-by-page control        | `<DataDisplay>` default (paginated)        |

### Hard Constraints

| # | Constraint |
|---|-----------|
| 1 | One `<DataDisplay>` per page — store is a module singleton, not per-instance |
| 2 | `DataTable` and `DataList` must be direct `children` of `DataDisplay` |
| 3 | Always import from `@/modules/data-display` — never from internal paths |
| 4 | Do not use `DataDisplay` for local/mock data — requires a real API endpoint |

### Definition of Done

- [ ] `<DataDisplay>` is the single source of fetch — no parallel `useEffect(fetch)` in the page
- [ ] `params` is memoized (`useState` / `useMemo`) — never an inline object literal
- [ ] CRUD endpoint follows the `/add`, `/get-all`, `/get-one`, `/update`, `/delete` contract
- [ ] For infinite scroll: `infiniteScroll` flag + `<DataList scrollable>` + `flex-1 min-h-0`
- [ ] Page wrapper uses `fixed inset-0` (or another bounded container) when full-height scroll is needed
- [ ] Edit/Delete actions go through `actions` prop + `onEdit` callback — no custom row buttons
- [ ] No `IntersectionObserver` against viewport, no `overflow: hidden` on `body`/`html`
