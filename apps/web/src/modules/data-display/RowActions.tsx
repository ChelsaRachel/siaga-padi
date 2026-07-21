import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDataDisplayStore } from './store/useDataDisplayStore';

interface RowActionsProps {
  row: Record<string, unknown>;
}

export function RowActions({ row }: RowActionsProps) {
  const { onEditRequest, onDeleteRequest } = useDataDisplayStore();

  const hasEdit = !!onEditRequest;
  const hasDelete = !!onDeleteRequest;

  if (!hasEdit && !hasDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <i className="ph ph-dots-three-vertical text-base" />
          <span className="sr-only">Aksi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {hasEdit && (
          <DropdownMenuItem onClick={() => onEditRequest(row)}>
            <i className="ph ph-pencil-simple mr-2 text-base" />
            Edit
          </DropdownMenuItem>
        )}
        {hasEdit && hasDelete && <DropdownMenuSeparator />}
        {hasDelete && (
          <DropdownMenuItem
            onClick={() => onDeleteRequest(row)}
            className="text-destructive focus:text-destructive"
          >
            <i className="ph ph-trash mr-2 text-base" />
            Hapus
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
