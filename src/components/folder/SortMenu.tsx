import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NoteSortKey } from '@/db/notes'
import type { NoteSort } from '@/hooks/useNoteSort'

const OPTIONS: { key: NoteSortKey; label: string; desc: string; asc: string }[] = [
  { key: 'edited', label: 'Last edited', desc: 'Newest first', asc: 'Oldest first' },
  { key: 'created', label: 'Created', desc: 'Newest first', asc: 'Oldest first' },
  { key: 'title', label: 'Title', desc: 'Z → A', asc: 'A → Z' },
  { key: 'length', label: 'Length', desc: 'Longest first', asc: 'Shortest first' },
]

export function SortMenu({ sort, onChange }: { sort: NoteSort; onChange: (sort: NoteSort) => void }) {
  const current = OPTIONS.find((o) => o.key === sort.key) ?? OPTIONS[0]
  const DirectionIcon = sort.direction === 'desc' ? ArrowDownWideNarrow : ArrowUpNarrowWide

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground" aria-label="Sort notes">
          <DirectionIcon />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.key}
            // Switching field starts with its natural direction: A → Z for titles, newest/longest first otherwise
            onSelect={() => onChange({ key: option.key, direction: option.key === 'title' ? 'asc' : 'desc' })}
          >
            {option.label}
            {option.key === sort.key && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {(current.key === 'title' ? (['asc', 'desc'] as const) : (['desc', 'asc'] as const)).map((direction) => (
          <DropdownMenuItem key={direction} onSelect={() => onChange({ ...sort, direction })}>
            {current[direction]}
            {direction === sort.direction && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-1.5 py-1 text-xs text-muted-foreground">Pinned notes stay on top.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
