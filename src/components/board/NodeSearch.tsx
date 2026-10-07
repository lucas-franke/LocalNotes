import { Panel } from '@xyflow/react'
import { FileText, Type } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { noteText, noteTitle } from '@/db/notes'
import type { Note } from '@/db/schema'
import type { BoardFlowNode } from './flow'

const MAX_RESULTS = 8

interface Result {
  id: string
  title: string
  detail: string
  type: 'note' | 'text'
  haystack: string
}

/**
 * "Find on board": type to filter the notes and texts on this board by title or content; picking one
 * selects it and zooms to it (also when it is far off screen).
 */
export function NodeSearch({
  nodes,
  notes,
  onFind,
}: {
  nodes: BoardFlowNode[]
  notes: Map<string, Note>
  onFind: (nodeId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const items = useMemo<Result[]>(
    () =>
      nodes.flatMap((n): Result[] => {
        const d = n.data
        if (d.type === 'note') {
          const note = notes.get(d.noteId)
          if (!note) return []
          return [
            { id: n.id, type: 'note', title: noteTitle(note), detail: 'Note', haystack: noteText(note).toLowerCase() },
          ]
        }
        if (d.type === 'text') {
          const line = d.text.trim().split('\n')[0]
          return [{ id: n.id, type: 'text', title: line, detail: 'Text', haystack: d.text.toLowerCase() }]
        }
        return []
      }),
    [nodes, notes],
  )

  const q = query.trim().toLowerCase()
  const matches = q ? items.filter((i) => i.haystack.includes(q)).slice(0, MAX_RESULTS) : []
  const showList = open && q !== ''

  const pick = (id: string) => {
    setOpen(false)
    setQuery('')
    onFind(id)
  }

  return (
    <Panel position="top-left" className="nodrag nopan nowheel w-64">
      <Command
        shouldFilter={false}
        label="Find on board"
        className="overflow-visible rounded-xl border bg-background shadow-sm [&_[data-slot=command-input-wrapper]]:p-1"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            setOpen(false)
            setQuery('')
          }
        }}
      >
        <CommandInput
          placeholder="Find on board…"
          value={query}
          onValueChange={(value) => {
            setQuery(value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        {/* Always rendered (just hidden): the input points at this list with aria-controls */}
        <CommandList className={cn('max-h-72 border-t', !showList && 'hidden')}>
          <CommandEmpty>Nothing on this board matches.</CommandEmpty>
          <CommandGroup>
            {matches.map((item) => (
              <CommandItem key={item.id} value={item.id} onSelect={() => pick(item.id)} className="min-h-9">
                {item.type === 'note' ? (
                  <FileText className="text-muted-foreground" />
                ) : (
                  <Type className="text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.detail}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </Panel>
  )
}
