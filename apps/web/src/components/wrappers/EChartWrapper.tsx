import { useRef, useEffect, useCallback, type CSSProperties } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption as EChartsCoreOption } from 'echarts'
import { useChartTheme, type ChartMode } from './useChartTheme'

export interface EChartWrapperProps {
  option: EChartsCoreOption
  mode?: ChartMode
  height?: number | string
  width?: number | string
  className?: string
  style?: CSSProperties
  loading?: boolean
  onChartReady?: (instance: echarts.ECharts) => void
}

export function EChartWrapper({
  option,
  mode = 'light',
  height = 320,
  width = '100%',
  className,
  style,
  loading = false,
  onChartReady,
}: EChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const theme = useChartTheme(mode)

  const init = useCallback(() => {
    if (!containerRef.current) return
    chartRef.current = echarts.init(containerRef.current)
    onChartReady?.(chartRef.current)
  }, [onChartReady])

  // init on mount, destroy on unmount
  useEffect(() => {
    init()
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [init])

  // apply theme + option whenever they change
  useEffect(() => {
    if (!chartRef.current) return

    const mergedOption: EChartsCoreOption = {
      backgroundColor: theme.backgroundColor,
      textStyle: theme.textStyle,
      title: theme.title,
      legend: theme.legend,
      tooltip: {
        ...theme.tooltip,
        ...(typeof option.tooltip === 'object' ? option.tooltip : {}),
      },
      ...option,
    }

    chartRef.current.setOption(mergedOption, { notMerge: true })
  }, [option, theme])

  // loading state
  useEffect(() => {
    if (!chartRef.current) return
    loading
      ? chartRef.current.showLoading('default', {
          text: '',
          color: theme.color[0],
          maskColor:
            mode === 'dark' ? 'rgba(16,16,20,0.7)' : 'rgba(255,255,255,0.7)',
        })
      : chartRef.current.hideLoading()
  }, [loading, mode, theme])

  // resize observer
  useEffect(() => {
    if (!containerRef.current || !chartRef.current) return
    const observer = new ResizeObserver(() => chartRef.current?.resize())
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width, height, ...style }}
      role="img"
      aria-label="chart"
    />
  )
}
