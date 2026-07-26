import type { ComponentProps, ReactNode } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { cn } from '@/utils/cn'

interface PerfectScrollAreaProps {
  children: ReactNode
  className?: string
  options?: ComponentProps<typeof PerfectScrollbar>['options']
}

/**
 * Mandatory wrapper for bounded in-app scroll regions (main column, sidebar
 * body, drawers, panels, fixed-height lists) — see
 * `skills/reactjs-responsive/SKILL.md` § Scrollable regions.
 *
 * Base library CSS is imported once in `src/index.css`; thumb/rail theming
 * lives there too (token-driven). Parents must provide a bounded height
 * (`flex-1 min-h-0`, explicit `h-*`, or `absolute inset-0`).
 */
export function PerfectScrollArea({ children, className, options }: PerfectScrollAreaProps) {
  return (
    <PerfectScrollbar
      className={cn('perfect-scroll-area min-h-0', className)}
      options={{ wheelPropagation: false, ...options }}
    >
      {children}
    </PerfectScrollbar>
  )
}
