import { FilterState } from '../types'

export function parseUrlParams(search: string): FilterState[] {
  const params = new URLSearchParams(search)
  const filters: FilterState[] = []

  params.forEach((value, key) => {
    filters.push({ key, value, source: 'url', scope: 'all' })
  })

  return filters
}

export function serializeToUrl(filters: FilterState[]): string {
  const params = new URLSearchParams()
  for (const f of filters) {
    if (f.value !== null && f.value !== undefined && f.value !== '') {
      params.set(f.key, String(f.value))
    }
  }
  return params.toString()
}
