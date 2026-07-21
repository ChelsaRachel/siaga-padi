import { useCallback } from 'react'
import { useFilterStore } from '../store/filter.store'
import { FilterScope } from '../types'

interface EmitterOptions {
  emitterId: string
  scope?: FilterScope
  targets?: string[]
}

export function useFilterEmitter({ emitterId, scope = 'all', targets }: EmitterOptions) {
  const dispatch = useFilterStore((s) => s.dispatch)

  const emit = useCallback(
    (key: string, value: unknown) => {
      dispatch({
        emitterId,
        filters: [{ key, value, source: 'widget', scope, targets }],
      })
    },
    [dispatch, emitterId, scope, targets],
  )

  const emitMultiple = useCallback(
    (values: Record<string, unknown>) => {
      dispatch({
        emitterId,
        filters: Object.entries(values).map(([key, value]) => ({
          key,
          value,
          source: 'widget',
          scope,
          targets,
        })),
      })
    },
    [dispatch, emitterId, scope, targets],
  )

  const clear = useCallback(() => {
    dispatch({ emitterId, filters: [] })
  }, [dispatch, emitterId])

  return { emit, emitMultiple, clear }
}
