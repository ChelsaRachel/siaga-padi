import { createResourceService, type IGetAllParams } from '@/services/resource.service'
import { useCallback, useEffect, useRef } from 'react'
import { useDataDisplayStore } from '../store/useDataDisplayStore'

interface UseInfiniteScrollOptions {
  endpoint: string
  params?: Record<string, unknown>
  pageSize?: number
}

export function useInfiniteScroll({ endpoint, params, pageSize = 20 }: UseInfiniteScrollOptions) {
  const { loading, hasMore, setLoading, setError, setHasMore, appendData, setPagination } =
    useDataDisplayStore()

  const pageRef = useRef(1)
  const service = useRef(createResourceService(endpoint))

  const fetchNext = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    setError(null)
    try {
      const mergedParams: IGetAllParams = {
        ...params,
        page: pageRef.current,
        size: pageSize,
      }
      const res = await service.current.getAll(mergedParams)
      if (res?.metaData?.responseCode === 200) {
        const incoming = (res.data ?? []) as Record<string, unknown>[]
        appendData(incoming)
        const pagination = res.metaData?.pagination ?? {}
        setPagination(pagination)
        const totalPages = pagination.totalPages ?? 1
        if (pageRef.current >= totalPages || incoming.length === 0) {
          setHasMore(false)
        } else {
          pageRef.current += 1
        }
      } else {
        setError(res?.message ?? 'Gagal memuat data')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, pageSize])

  // Reset store and restart from page 1 when params/endpoint/pageSize change
  useEffect(() => {
    pageRef.current = 1
    useDataDisplayStore.setState({ data: [], hasMore: true, error: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), pageSize, endpoint])

  // Initial fetch after reset
  useEffect(() => {
    const fetch = async () => {
      const store = useDataDisplayStore.getState()
      if (store.loading) return
      store.setLoading(true)
      store.setError(null)
      try {
        const res = await service.current.getAll({
          ...params,
          page: 1,
          size: pageSize,
        })
        if (res?.metaData?.responseCode === 200) {
          const incoming = (res.data ?? []) as Record<string, unknown>[]
          store.appendData(incoming)
          const pagination = res.metaData?.pagination ?? {}
          store.setPagination(pagination)
          const totalPages = pagination.totalPages ?? 1
          if (totalPages <= 1 || incoming.length === 0) {
            store.setHasMore(false)
          } else {
            pageRef.current = 2
          }
        } else {
          store.setError(res?.message ?? 'Gagal memuat data')
        }
      } catch (err: unknown) {
        store.setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      } finally {
        store.setLoading(false)
      }
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), pageSize, endpoint])

  // Register fetchNext into store so DataList sentinel can call it
  useEffect(() => {
    useDataDisplayStore.setState({ fetchNext })
  }, [fetchNext])

  return { fetchNext }
}
