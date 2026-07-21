import { ComponentType } from 'react'
import { useResolvedFilterParams } from '../hooks/use-resolved-filters'

export interface WithFilterSupportProps {
  widgetId: string
  resolvedFilters: Record<string, unknown>
}

export function withFilterSupport<P extends WithFilterSupportProps>(
  WrappedComponent: ComponentType<P>,
) {
  return function FilteredWidget(props: Omit<P, 'resolvedFilters'> & { widgetId: string }) {
    const resolvedFilters = useResolvedFilterParams(props.widgetId)
    return <WrappedComponent {...(props as P)} resolvedFilters={resolvedFilters} />
  }
}
