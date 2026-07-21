import { useMemo } from 'react'

// Fusion Design System tokens — light/dark values
const PALETTE = {
  primary:    { light: '#0d5eba', dark: '#5d93d1' },
  secondary:  { light: '#ff6f00', dark: '#ff8c33' },
  tertiary:   { light: '#16a085', dark: '#45b39d' },
  quaternary: { light: '#c70039', dark: '#d23361' },
  quinary:    { light: '#8e44ad', dark: '#8e44ad' },
} as const

const TEXT = {
  primary:   { light: '#050505', dark: '#f5f7fa' },
  secondary: { light: '#5b5d63', dark: '#b7babd' },
  disabled:  { light: '#989b9f', dark: '#7a7c81' },
} as const

const BG = {
  primary:   { light: '#ffffff', dark: '#101014' },
  secondary: { light: '#f5f7fa', dark: '#2d2e33' },
  border:    { light: '#e6e9f0', dark: '#5b5d63' },
} as const

export type ChartMode = 'light' | 'dark'

export interface ChartTheme {
  color: string[]
  backgroundColor: string
  textStyle: { color: string; fontFamily: string; fontSize: number }
  title: { textStyle: { color: string }; subtextStyle: { color: string } }
  legend: { textStyle: { color: string } }
  tooltip: {
    backgroundColor: string
    borderColor: string
    textStyle: { color: string }
  }
  axisLabel: { color: string }
  splitLine: { lineStyle: { color: string } }
  axisLine: { lineStyle: { color: string } }
}

export function useChartTheme(mode: ChartMode): ChartTheme {
  return useMemo(
    () => ({
      color: [
        PALETTE.primary[mode],
        PALETTE.secondary[mode],
        PALETTE.tertiary[mode],
        PALETTE.quaternary[mode],
        PALETTE.quinary[mode],
      ],
      backgroundColor: BG.primary[mode],
      textStyle: {
        color: TEXT.primary[mode],
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
      },
      title: {
        textStyle: { color: TEXT.primary[mode] },
        subtextStyle: { color: TEXT.secondary[mode] },
      },
      legend: {
        textStyle: { color: TEXT.secondary[mode] },
      },
      tooltip: {
        backgroundColor: BG.secondary[mode],
        borderColor: BG.border[mode],
        textStyle: { color: TEXT.primary[mode] },
      },
      axisLabel: { color: TEXT.secondary[mode] },
      splitLine: { lineStyle: { color: BG.border[mode] } },
      axisLine: { lineStyle: { color: BG.border[mode] } },
    }),
    [mode],
  )
}
