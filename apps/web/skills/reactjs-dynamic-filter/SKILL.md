---
name: dynamic-filter
description: Build dynamic filter system for dashboard pages. Covers all 6 filter types — URL filter, global-all, global-partial, nested/dependent, use-as-filter (widget-to-widget), and exclude-self. Use when adding any filter widget, making a widget emit filters to others, or wiring a new page to the filter store.
---

# Dynamic Filter Skill

Every filter in this project flows through one centralized Zustand store. Read this skill completely before writing any filter-related code.

> Detailed type specs → [references/filter-types.md](references/filter-types.md)
> Rules & anti-patterns → [references/filter-rules.md](references/filter-rules.md)

---

## Stack

| Layer | Library / File |
|-------|---------------|
| State | Zustand — `src/modules/dynamic-filter/store/filter.store.ts` |
| Types | `src/modules/dynamic-filter/types/filter.types.ts` |
| Hooks | `useResolvedFilterParams`, `useFilterEmitter`, `useUrlFilters` |
| HOC | `withFilterSupport` — `src/modules/dynamic-filter/hoc/withFilterSupport.tsx` |
| Components | `src/modules/dynamic-filter/components/` — 18 filter components |
| Config | `{page}/config/{page}.filter-map.ts` per page |

---

## Module Structure

```
src/modules/dynamic-filter/
├── types/
│   ├── filter.types.ts         ← FilterState, FilterEvent, WidgetFilterConfig, WidgetFilterMap
│   └── index.ts
├── store/
│   └── filter.store.ts         ← Zustand: dispatch, resolve, clearFilterKey, reset, setFilterMap
├── hooks/
│   ├── use-url-filters.ts      ← sync URL → store on page load
│   ├── use-resolved-filters.ts ← useResolvedFilters, useResolvedFilterParams
│   └── use-filter-emitter.ts   ← useFilterEmitter: emit, emitMultiple, clear
├── hoc/
│   └── withFilterSupport.tsx   ← HOC: inject resolvedFilters into any widget
├── utils/
│   ├── filter.merge.ts         ← mergeFilters() — pure function
│   ├── filter.scope.ts         ← isApplicable() — pure function
│   └── filter.url.ts           ← parseUrlParams(), serializeToUrl()
├── components/
│   ├── Filter.tsx              ← Single select (global/partial)
│   ├── DependentFilter.tsx     ← Select whose options depend on another filter's value
│   ├── TextDebounce.tsx        ← Text input with debounce
│   ├── TagInput.tsx            ← Multi-tag input (Enter/comma)
│   ├── Radio.tsx               ← RadioGroup single select
│   ├── ChipGroup.tsx           ← Single-select chip row (touch-first)
│   ├── SelectAsync.tsx         ← Select with async fetch
│   ├── TreeSelect.tsx          ← Hierarchical tree select
│   ├── Checkbox.tsx            ← Multi-select via checkboxes
│   ├── MultiSelectStatic.tsx   ← Multi-select popover (static options)
│   ├── MultiSelectAsync.tsx    ← Multi-select popover (async fetch)
│   ├── Toggle.tsx              ← Boolean toggle (Switch)
│   ├── NumberInput.tsx         ← Single number input
│   ├── BetweenNumber.tsx       ← Min–Max number input pair
│   ├── Slider.tsx              ← Single value slider
│   ├── SliderRange.tsx         ← Range slider (min–max)
│   ├── DatePicker.tsx          ← Single date picker
│   ├── DateRange.tsx           ← Date range picker (from–to)
│   ├── RelativeDate.tsx        ← Relative date preset buttons (Today, Last 7 days, etc.)
│   └── index.ts                ← exports all components
└── index.ts                    ← public API: hooks, store, hoc, types
```

---

## 18 Filter Components — Quick Reference

| Component | Props Key | Emitted Value | Type |
|-----------|-----------|--------------|------|
| `Filter` | `filterKey` | `string` | Single select |
| `DependentFilter` | `filterKey`, `dependsOnKey` | `string` | Connected select |
| `TextDebounce` | `filterKey` | `string` | Text debounce |
| `TagInput` | `filterKey` | `string[]` | Multi-tag input |
| `Radio` | `filterKey` | `string` | RadioGroup |
| `ChipGroup` | `filterKey` | `string` | Single-select chip row (touch-first, clears via "all" chip) |
| `SelectAsync` | `filterKey`, `fetchOptions` | `string` | Async select |
| `TreeSelect` | `filterKey`, `nodes` | `string` | Tree select |
| `Checkbox` | `filterKey` | `string[]` | Multi checkbox |
| `MultiSelectStatic` | `filterKey`, `options` | `string[]` | Multi select |
| `MultiSelectAsync` | `filterKey`, `fetchOptions` | `string[]` | Multi async |
| `Toggle` | `filterKey`, `valueOn`, `valueOff` | `boolean\|any` | Switch |
| `NumberInput` | `filterKey` | `number` | Number input |
| `BetweenNumber` | `filterKeyMin`, `filterKeyMax` | `number, number` | Min–Max input |
| `Slider` | `filterKey` | `number` | Single slider |
| `SliderRange` | `filterKeyMin`, `filterKeyMax` | `number, number` | Range slider |
| `DatePicker` | `filterKey` | `string (yyyy-MM-dd)` | Date picker |
| `DateRange` | `filterKeyFrom`, `filterKeyTo` | `string, string` | Date range |
| `RelativeDate` | `filterKeyFrom`, `filterKeyTo` | `string, string` | Preset date |

All components accept `config?: WidgetFilterConfig` prop for scope/targets.

If none of the 18 components fits the UI requirement, a new component may be added — see rules in [references/filter-rules.md](references/filter-rules.md).

---

## 6 Filter Types — Quick Reference

| # | Name | Component | scope | Target |
|---|------|-----------|-------|--------|
| 1 | URL Filter | `useUrlFilters()` | `all` | All widgets |
| 2 | Global → All | `Filter` | `all` | All widgets |
| 3 | Global → Partial | `Filter` | `partial` | Widgets in `targets[]` |
| 4 | Connect to Other Filter | `DependentFilter` + any component | `all`/`partial` | Per config |
| 5 | Use as Filter | `useFilterEmitter` inside widget | `partial` | Widgets in `targets[]` |
| 6 | Use as Filter (exclude self) | `useFilterEmitter` inside widget | `exclude-self` | All minus emitter |

---

## Step 1 — Create filter-map.ts

Every page that uses filters must have a `config/{page}.filter-map.ts`.

```ts
// src/pages/dashboard/config/dashboard.filter-map.ts
import { WidgetFilterMap } from '@/modules/dynamic-filter'

export const dashboardFilterMap: WidgetFilterMap = {

  // Type 2 — Global → All
  'filter-period': {
    scope: 'all',
  },

  // Type 3 — Global → Partial (specific widgets only)
  'filter-category': {
    scope: 'partial',
    targets: ['chart-revenue', 'table-orders'],
  },

  // Type 4 — Connected (options depend on filter-category)
  'filter-product': {
    scope: 'all',
  },

  // Type 5 — Use as Filter (table filters other charts)
  'table-orders': {
    useAsFilter: true,
    scope: 'partial',
    targets: ['chart-revenue', 'chart-trend'],
  },

  // Type 6 — Use as Filter (exclude self)
  'chart-region': {
    useAsFilter: true,
    scope: 'exclude-self',
    targets: ['chart-revenue', 'table-orders', 'chart-trend'],
  },
}
```

---

## Step 2 — Page Setup

```tsx
// src/pages/dashboard/DashboardPage.tsx
import { useEffect } from 'react'
import { useFilterStore, useUrlFilters } from '@/modules/dynamic-filter'
import { dashboardFilterMap } from './config/dashboard.filter-map'

export default function DashboardPage() {
  useUrlFilters()  // Type 1: sync URL params → store

  const setFilterMap = useFilterStore((s) => s.setFilterMap)
  useEffect(() => {
    setFilterMap(dashboardFilterMap)
    return () => setFilterMap({})  // cleanup on unmount
  }, [setFilterMap])

  return (/* ... */)
}
```

---

## Step 3 — Type 2 & 3: Filter (Global / Partial)

```tsx
import { Filter } from '@/modules/dynamic-filter/components'

// Type 2 — scope: "all" → all widgets
<Filter
  id="filter-period"
  filterKey="period"
  options={[
    { label: 'January 2026', value: '2026-01' },
    { label: 'February 2026', value: '2026-02' },
  ]}
  config={dashboardFilterMap['filter-period']}
/>

// Type 3 — scope: "partial" → targets only
<Filter
  id="filter-category"
  filterKey="category"
  options={[
    { label: 'All', value: 'all' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Fashion', value: 'fashion' },
  ]}
  config={dashboardFilterMap['filter-category']}
/>
```

---

## Step 4 — Type 4: Connect to Other Filter (dependsOnKey)

One filter is "connected" to another — its value depends on and auto-resets when the referenced filter changes. This works with **any filter component**, not just `DependentFilter`.

**Example — 3-level chain (Province → District → Sub-district):**

```tsx
import { Filter, DependentFilter } from '@/modules/dynamic-filter/components'

// Provider — does not depend on anything
<Filter
  id="filter-province"
  filterKey="province"
  options={PROVINCE_OPTIONS}
  config={dashboardFilterMap['filter-province']}
/>

// Consumer of province, provider for sub-district
<DependentFilter
  id="filter-district"
  filterKey="district"
  dependsOnKey="province"           // connected to filter-province
  options={DISTRICT_OPTIONS}        // each option has dependsOnValue
  config={dashboardFilterMap['filter-district']}
/>

// Consumer of district
<DependentFilter
  id="filter-subdistrict"
  filterKey="subdistrict"
  dependsOnKey="district"           // connected to filter-district
  options={SUBDISTRICT_OPTIONS}
  config={dashboardFilterMap['filter-subdistrict']}
/>
```

**Auto-reset cascade:** Province changes → District resets → Sub-district resets automatically.

> Chains longer than 2 levels are allowed when there is a clear data hierarchy.
> For non-`DependentFilter` components, read the parent value from the store and pass it into `fetchOptions`.

---

## Step 5 — Type 5 & 6: Use as Filter (inside a widget)

Non-filter widgets (charts, tables, maps) that emit filters when the user interacts with them.

```tsx
import { useFilterStore, useFilterEmitter } from '@/modules/dynamic-filter'
import { dashboardFilterMap } from './config/dashboard.filter-map'

function TableOrdersWidget() {
  const activeOrderId = useFilterStore((s) =>
    s.globalFilters.find((f) => f.key === 'orderId')?.value as string | undefined
  )
  const clearFilterKey = useFilterStore((s) => s.clearFilterKey)

  const { emit } = useFilterEmitter({
    emitterId: 'table-orders',
    scope: dashboardFilterMap['table-orders'].scope,
    targets: dashboardFilterMap['table-orders'].targets,
  })

  function handleRowClick(orderId: string) {
    if (activeOrderId === orderId) clearFilterKey('orderId')
    else emit('orderId', orderId)
  }

  return (
    <div>
      {MOCK_ORDERS.map((order) => (
        <button
          key={order.id}
          onClick={() => handleRowClick(order.id)}
          className={activeOrderId === order.id ? 'bg-blue-50' : ''}
        >
          {order.id} — {order.customer}
        </button>
      ))}
    </div>
  )
}
```

---

## Step 6 — Filter Receiver Widget

```tsx
import { useResolvedFilterParams } from '@/modules/dynamic-filter'

function ChartRevenueWidget() {
  const filters = useResolvedFilterParams('chart-revenue')
  // filters = { period: "2026-01", category: "electronics", orderId: "ORD-001" }

  // useQuery({ queryKey: ['revenue', filters], queryFn: () => fetchRevenue(filters) })

  return <div>chart with {JSON.stringify(filters)}</div>
}
```

**With HOC (optional):**

```tsx
import { withFilterSupport, WithFilterSupportProps } from '@/modules/dynamic-filter'

interface ChartProps extends WithFilterSupportProps {
  title: string
}

function ChartRevenue({ title, resolvedFilters }: ChartProps) {
  return <div>{title} — {JSON.stringify(resolvedFilters)}</div>
}

export const FilteredChartRevenue = withFilterSupport(ChartRevenue)

// Usage:
<FilteredChartRevenue widgetId="chart-revenue" title="Revenue" />
```

---

## Full Scenario Matrix

| Scenario | Emitter | Store | Receiver | Clear by |
|----------|---------|-------|----------|----------|
| URL load | `useUrlFilters()` | `urlFilters` | All widgets | Navigate away |
| Select Period | `Filter` scope `all` | `globalFilters` | All widgets | Select new value |
| Select Category | `Filter` scope `partial` | `globalFilters` | chart-revenue, table-orders | Select new value |
| Select Product | `DependentFilter` scope `all` | `globalFilters` | All widgets | Category changes → auto |
| Click Orders row | `useFilterEmitter` scope `partial` | `globalFilters` | chart-revenue, chart-trend | Click row again |
| Click Map region | `useFilterEmitter` scope `exclude-self` | `globalFilters` | All except map | Click region again |

---

## Hooks API Summary

```ts
// Consume filters in receiver widgets
useResolvedFilters(widgetId)        // → FilterState[]
useResolvedFilterParams(widgetId)   // → Record<string, unknown>

// Emit filters from a widget
useFilterEmitter({ emitterId, scope, targets })
  → { emit(key, value), emitMultiple(values), clear() }

// Sync URL → store (call at page level only)
useUrlFilters()

// Direct store actions
useFilterStore((s) => s.clearFilterKey(key))  // remove 1 key from all sources
useFilterStore((s) => s.reset(widgetId?))     // reset all or per widget
useFilterStore((s) => s.resolve(widgetId))    // same as useResolvedFilters
```

---

## Quick Rules

| Rule | Value |
|------|-------|
| Filter state | Zustand store — never `useState` |
| Read parent value | Directly from `globalFilters.find(key)` — never via `resolve()` |
| filter-map path | `src/pages/{page}/config/{page}.filter-map.ts` |
| filter-map register | Required in page component, cleanup on unmount |
| `scope: "partial"` | Must include `targets[]` |
| Toggle/deselect | Use `clearFilterKey(key)` — never dispatch empty |
| Active state (use-as-filter) | Read from store, not local state |
| URL filter | `useUrlFilters()` at page level only |
| Receiver widget | Always use `useResolvedFilterParams(widgetId)` |

> Full type specs: [references/filter-types.md](references/filter-types.md)
> Rules & checklist: [references/filter-rules.md](references/filter-rules.md)
