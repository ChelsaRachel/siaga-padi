import { useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'

export interface TreeNode {
  label: string
  value: string
  children?: TreeNode[]
}

interface TreeSelectProps {
  id: string
  filterKey: string
  nodes: TreeNode[]
  config?: WidgetFilterConfig
  placeholder?: string
}

function TreeNodeItem({ node, onSelect, selectedValue, depth = 0 }: { node: TreeNode; onSelect: (n: TreeNode) => void; selectedValue?: string; depth?: number }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = !!node.children?.length

  return (
    <div>
      <div className={cn('flex items-center gap-1 rounded text-sm cursor-pointer hover:bg-muted py-1.5', selectedValue === node.value && 'bg-muted font-medium')} style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}>
        {hasChildren ? (
          <button onClick={() => setExpanded((v) => !v)} className="p-0.5 hover:bg-accent rounded">
            {expanded ? <i className="ph ph-caret-down text-[12px]" aria-hidden="true" /> : <i className="ph ph-caret-right text-[12px]" aria-hidden="true" />}
          </button>
        ) : <span className="w-4" />}
        <span onClick={() => onSelect(node)} className="flex-1">{node.label}</span>
      </div>
      {expanded && hasChildren && node.children!.map((child) => (
        <TreeNodeItem key={child.value} node={child} onSelect={onSelect} selectedValue={selectedValue} depth={depth + 1} />
      ))}
    </div>
  )
}

export function TreeSelect({ id, filterKey, nodes, config, placeholder = 'Pilih...' }: TreeSelectProps) {
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState<TreeNode | null>(null)
  const { emit, clear } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  function handleSelect(node: TreeNode) {
    if (selected?.value === node.value) { setSelected(null); clear() }
    else { setSelected(node); emit(filterKey, node.value) }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className="w-50 justify-between font-normal">
          <span className={selected ? '' : 'text-muted-foreground'}>{selected ? selected.label : placeholder}</span>
          <i className="ph ph-caret-down text-[16px] opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-55 p-2" align="start">
        <ScrollArea className="max-h-64">
          {nodes.map((node) => <TreeNodeItem key={node.value} node={node} onSelect={handleSelect} selectedValue={selected?.value} />)}
        </ScrollArea>
        {selected && (
          <button onClick={() => { setSelected(null); clear() }} className="w-full mt-2 text-xs text-muted-foreground hover:text-destructive text-center">Hapus pilihan</button>
        )}
      </PopoverContent>
    </Popover>
  )
}
