import { useCallback, useEffect, useRef } from 'react'
import { useDataDisplayStore } from '../store/useDataDisplayStore'

interface DataListProps {
  children?: React.ReactNode
  scrollable?: boolean
  className?: string
}

export function DataList({ children, scrollable = false, className }: DataListProps) {
  const { loading, error, data, hasMore, fetchNext } = useDataDisplayStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const rows = data as Record<string, unknown>[]

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el || loading || !hasMore || !fetchNext) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom) fetchNext()
  }, [loading, hasMore, fetchNext])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !scrollable) return
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [scrollable, handleScroll])

  if (!scrollable) {
    if (loading) return <p className="text-center text-sm text-muted-foreground py-10">Memuat data...</p>
    if (error) return <p className="text-center text-sm text-destructive py-10">{error}</p>
    if (rows.length === 0) return <p className="text-center text-sm text-muted-foreground py-10">Tidak ada data</p>
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={containerRef} className={`overflow-y-auto ${className ?? ''}`}>
      {rows.length === 0 && !loading && !error && (
        <p className="text-center text-sm text-muted-foreground py-10">Tidak ada data</p>
      )}
      {error && <p className="text-center text-sm text-destructive py-4">{error}</p>}
      {children}
      {loading && <p className="text-center text-sm text-muted-foreground py-4">Memuat data...</p>}
      {!hasMore && rows.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">Semua data sudah ditampilkan</p>
      )}
    </div>
  )
}
