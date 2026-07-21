# ECharts — Sample Code

> Default chart library. Rules and constraints: [../SKILL.md](../SKILL.md)

---

## ChartMode Derivation (canonical)

```tsx
import type { ChartMode } from '@/components/wrappers/useChartTheme'

const theme = useThemeStore((s) => s.theme)
const chartMode: ChartMode =
  theme === 'dark'
    ? 'dark'
    : theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
```

## Per-Mode Color Constants (canonical)

```tsx
const LINE_COLOR = {
  light: '#0d5eba', // primary-500
  dark:  '#5d93d1', // primary-300
} as const

const lineColor = LINE_COLOR[chartMode]
```

## Label Formatter (canonical)

```tsx
label: {
  formatter: (p: unknown) => {
    const v = (p as { value?: unknown }).value
    return typeof v === 'number' && v !== 0 ? String(v) : ''
  },
},
```

---

## Basic Bar / Line Chart

```tsx
import { EChartWrapper } from '@/components/wrappers/EChartWrapper'
import type { EChartsOption } from 'echarts'

const option: EChartsOption = {
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [120, 200, 150] }],
}

<EChartWrapper option={option} mode={chartMode} height={320} />
```

## With Loading State

```tsx
const { data, isLoading } = useQuery(...)

<EChartWrapper
  option={buildOption(data)}
  mode={chartMode}
  loading={isLoading}
  height={320}
/>
```

## Accessing the Chart Instance

```tsx
import { useRef } from 'react'
import type * as echarts from 'echarts'

const chartRef = useRef<echarts.ECharts | null>(null)

<EChartWrapper
  option={option}
  mode={chartMode}
  onChartReady={(instance) => { chartRef.current = instance }}
/>

chartRef.current?.dispatchAction({ type: 'highlight', seriesIndex: 0 })
```

## Gauge / Any Other Chart Type

```tsx
// All chart types available in the full bundle — no echarts.use() needed
const option: EChartsOption = {
  series: [{ type: 'gauge', data: [{ value: 50, name: 'Progress' }] }],
}
<EChartWrapper option={option} mode={chartMode} height={300} />
```

## Responsive Height

```tsx
<EChartWrapper option={option} mode={chartMode} height={400} width="100%" />
<EChartWrapper option={option} mode={chartMode} height="50vh" />
```
