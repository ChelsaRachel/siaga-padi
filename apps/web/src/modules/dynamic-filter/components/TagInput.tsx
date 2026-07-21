import { KeyboardEvent, useState } from 'react'
import { useFilterEmitter } from '@/modules/dynamic-filter'
import { WidgetFilterConfig } from '@/modules/dynamic-filter/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface TagInputProps {
  id: string
  filterKey: string
  config?: WidgetFilterConfig
  placeholder?: string
  maxTags?: number
}

export function TagInput({ id, filterKey, config, placeholder = 'Ketik lalu Enter...', maxTags = 10 }: TagInputProps) {
  const [tags, setTags]   = useState<string[]>([])
  const [input, setInput] = useState('')
  const { emit, clear } = useFilterEmitter({ emitterId: id, scope: config?.scope ?? 'all', targets: config?.targets })

  function addTag() {
    const trimmed = input.trim()
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return
    const next = [...tags, trimmed]
    setTags(next)
    setInput('')
    emit(filterKey, next)
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    if (next.length) emit(filterKey, next)
    else clear()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && input === '' && tags.length) removeTag(tags[tags.length - 1])
  }

  return (
    <div className="flex flex-wrap gap-1 items-center border rounded-md px-2 py-1.5 min-h-9 w-70 focus-within:ring-1 focus-within:ring-ring">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
          {tag}
          <button onClick={() => removeTag(tag)}><i className="ph ph-x text-[12px]" aria-hidden="true" /></button>
        </Badge>
      ))}
      <Input
        id={id}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="border-0 p-0 h-auto focus-visible:ring-0 flex-1 min-w-20 text-sm"
        disabled={tags.length >= maxTags}
      />
    </div>
  )
}
