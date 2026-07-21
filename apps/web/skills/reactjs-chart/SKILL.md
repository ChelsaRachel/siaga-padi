---
name: reactjs-chart
description: Rules and constraints for the only approved React chart stack — ECharts via EChartWrapper. Covers mandatory patterns, forbidden patterns, and enforcement checklist. Map use cases are handled by the reactjs-map skill.
---

# Skill — Chart (ECharts)

Wrapper source: `src/components/wrappers/`
- `EChartWrapper.tsx` — ECharts wrapper
- `useChartTheme.ts` — theme hook

**Default chart library:** ECharts via `EChartWrapper`. Do not introduce Recharts, Chart.js, ApexCharts, Nivo, Victory, or custom SVG/canvas chart stacks unless the user explicitly adds an alternative chart option to this skill.

Samples: [references/echarts-samples.md](references/echarts-samples.md)
Map rules: `.claude/skills/reactjs-map/SKILL.md`

---

## Mandatory

- **Always use `EChartWrapper`** — never import `echarts` directly in a page or feature component.
- **Every chart case in the React stack must use ECharts** — do not introduce Recharts, Chart.js, ApexCharts, Nivo, Victory, or custom SVG/canvas stacks.
- **Never hardcode unexplained hex** in ECharts `option` — derive colors from `useChartTheme(mode)`, CSS variables wired from the active design system, `design/tokens-web.json`, or per-mode constants with an inline comment naming the source token.
- The `mode` prop must be typed as `ChartMode` (`'light' | 'dark'`) — import from `@/components/wrappers/useChartTheme`. Never type it as `string`.
- `ChartMode` must always be derived from the Zustand theme store, resolving the `'system'` value explicitly before passing to the wrapper.
- Register chart types only inside `EChartWrapper` — feature components must not call `echarts.use()`.
- All chart containers must be **responsive** — use `width="100%"` with an explicit `height`.
- `option` carries data, series, and the full styling story — grid, axes, split lines/areas, tooltip/legend layout, series cosmetics, emphasis, marks, etc. `EChartWrapper` merges **defaults** for global keys (`backgroundColor`, `textStyle`, `title`, `legend`, baseline `tooltip`, default `color[]`); caller `option` is spread **last** and overrides when richer treatment is needed. The wrapper is a floor, not a ceiling.
- Label `formatter` callbacks must be typed as `(p: unknown) => string` with runtime narrowing — never `(p: { value: number }) => string`.
- When the product needs new shared chart tokens, extend `useChartTheme` or the wrapper merge logic — do not scatter duplicate hex across features.
- Canvas theming belongs in ECharts `option` + `useChartTheme` / tokens. Surrounding panel chrome (cards, headers, HUD frames) uses normal React + Tailwind.
- Accessibility: provide a descriptive `aria-label` when the default `"chart"` label is insufficient.

---

## Forbidden

| Violation | Rule |
|-----------|------|
| `import * as echarts from 'echarts'` in feature file | Use `EChartWrapper` |
| `recharts` / `chart.js` / `apexcharts` / `nivo` | Use ECharts via `EChartWrapper` |
| Hardcoded hex in `option` without token annotation | Use `useChartTheme`, tokens, or annotated constants |
| `echarts.use()` in a feature component | Register only inside `EChartWrapper` |
| `mode` typed as `string` not `ChartMode` | Import `ChartMode` from `useChartTheme` |
| `mode="light"` hardcoded | Always derive from Zustand theme store |
| `'system'` theme passed directly to wrapper | Resolve to `'light'` or `'dark'` first |
| `formatter: (p: { value: number }) => ...` | Use `(p: unknown)` + runtime narrowing |

---

## Extending the Wrapper

When a new prop or capability is needed:

1. Add the prop to `EChartWrapperProps` with a sensible default.
2. Handle it in its own `useEffect` — one effect per concern.
3. Add a usage example to [references/visualization-samples.md](references/visualization-samples.md).

Do not break existing prop contracts — all existing props must remain backward-compatible.
