import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useDataDisplayStore } from '../store/useDataDisplayStore'

interface DataTableProps {
  dataRows: Record<string, unknown>[]
  columns: ColumnDef<Record<string, unknown>>[]
}

export function DataTable({ columns, dataRows }: DataTableProps) {
  const { loading, error } = useDataDisplayStore()

  const table = useReactTable({
    data: dataRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-8">Memuat data...</p>
  }

  if (error) {
    return <p className="text-center text-sm text-destructive py-8">{error}</p>
  }

  if (dataRows.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">Tidak ada data</p>
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const meta: any = header.column.columnDef.meta
              return (
                <TableHead key={header.id} className={meta?.headerClassName}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
