import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PaginationControl } from '@/components/ui/pagination-control'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type ColumnDef } from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import { useDataDisplay } from './hooks/useDataDisplay'
import { useInfiniteScroll } from './hooks/useInfiniteScroll'
import { useDataDisplayStore } from './store/useDataDisplayStore'

interface DataDisplayActions {
  edit?: boolean
  delete?: boolean
}

interface DataDisplayProps {
  endpoint: string
  columns?: ColumnDef<Record<string, unknown>>[]
  params?: Record<string, unknown>
  children: React.ReactNode
  actions?: DataDisplayActions
  itemPerPage?: number
  totalData?: number
  pageSizeOptions?: number[]
  defaultPageSize?: number
  pagination?: boolean
  infiniteScroll?: boolean
  onEdit?: (row: Record<string, unknown>) => void
}

function PaginatedDisplay({
  endpoint,
  params,
  children,
  actions,
  itemPerPage,
  totalData,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize,
  pagination = true,
  onEdit,
}: Omit<DataDisplayProps, 'infiniteScroll'>) {
  const sizeInitialized = useRef(false)
  if (!sizeInitialized.current && itemPerPage) {
    useDataDisplayStore.setState((s) => ({ pagination: { ...s.pagination, size: itemPerPage } }))
    sizeInitialized.current = true
  }

  const { data, pagination: paginationState } = useDataDisplayStore()
  const { deleteById, changePage, changeSize } = useDataDisplay({ endpoint, params })
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (defaultPageSize) changeSize?.(defaultPageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pageCount = totalData ? Math.ceil(totalData / paginationState.size) : undefined

  const resolvedPageSizeOptions =
    defaultPageSize && !pageSizeOptions.includes(defaultPageSize)
      ? [...pageSizeOptions, defaultPageSize].sort((a, b) => a - b)
      : pageSizeOptions

  const onEditRef = useRef(onEdit)
  useEffect(() => { onEditRef.current = onEdit })

  useEffect(() => {
    useDataDisplayStore.setState({
      onDeleteRequest: actions?.delete ? setDeleteTarget : undefined,
      onEditRequest: actions?.edit ? (row) => onEditRef.current?.(row) : undefined,
    })
  }, [actions?.delete, actions?.edit])

  function handleConfirmDelete() {
    if (deleteTarget?.id) deleteById(deleteTarget.id as string)
    setDeleteTarget(null)
  }

  return (
    <>
      {children}
      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Total <span className="font-medium text-foreground">{paginationState.totalElements ?? 0}</span> data &mdash; Halaman{' '}
            <span className="font-medium text-foreground">{paginationState.page}</span> dari{' '}
            <span className="font-medium text-foreground">{paginationState.totalPages ?? '-'}</span>
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Tampilkan</span>
              <Select value={String(paginationState.size)} onValueChange={(val) => changeSize?.(Number(val))}>
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resolvedPageSizeOptions.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>baris</span>
            </div>
            <PaginationControl
              pageCount={pageCount ?? Math.max(paginationState.page, data.length < paginationState.size ? paginationState.page : paginationState.page + 1)}
              forcePage={paginationState.page - 1}
              pageRangeDisplayed={5}
              marginPagesDisplayed={1}
              showFirstLast
              disableInitialCallback
              onPageChange={(selected) => changePage?.(selected + 1)}
            />
          </div>
        </div>
      )}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>Data ini akan dihapus secara permanen. Apakah Anda yakin?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function InfiniteDisplay({
  endpoint,
  params,
  children,
  actions,
  itemPerPage = 20,
  onEdit,
}: Omit<DataDisplayProps, 'infiniteScroll' | 'pagination' | 'pageSizeOptions' | 'defaultPageSize' | 'totalData'>) {
  useInfiniteScroll({ endpoint, params, pageSize: itemPerPage })

  const { deleteById } = useDataDisplay({ endpoint, params, skipAutoFetch: true })
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)

  const onEditRef = useRef(onEdit)
  useEffect(() => { onEditRef.current = onEdit })

  useEffect(() => {
    useDataDisplayStore.setState({
      onDeleteRequest: actions?.delete ? setDeleteTarget : undefined,
      onEditRequest: actions?.edit ? (row) => onEditRef.current?.(row) : undefined,
    })
  }, [actions?.delete, actions?.edit])

  function handleConfirmDelete() {
    if (deleteTarget?.id) deleteById(deleteTarget.id as string)
    setDeleteTarget(null)
  }

  return (
    <>
      {children}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>Data ini akan dihapus secara permanen. Apakah Anda yakin?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DataDisplay({ infiniteScroll = false, ...props }: DataDisplayProps) {
  if (infiniteScroll) return <InfiniteDisplay {...props} />
  return <PaginatedDisplay {...props} />
}
