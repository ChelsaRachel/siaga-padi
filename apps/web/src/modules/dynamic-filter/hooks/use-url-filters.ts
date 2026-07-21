import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useFilterStore } from '../store/filter.store'
import { parseUrlParams } from '../utils/filter.url'

export function useUrlFilters() {
  const location = useLocation()
  const setUrlFilters = useFilterStore((s) => s.setUrlFilters)

  useEffect(() => {
    const filters = parseUrlParams(location.search)
    setUrlFilters(filters)
  }, [location.search, setUrlFilters])
}
