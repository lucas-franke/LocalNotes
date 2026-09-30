import { useLiveQuery } from 'dexie-react-hooks'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { db } from '@/db/db'
import { notePreview, noteText, noteTitle, sortNotes } from '@/db/notes'
import type { Note } from '@/db/schema'

/** Searchable list of the notes that are not on the board yet. Enter (or a click) adds the highlighted one. */
export function NotePicker({
  open,
  onOpenChange,
  excludeIds,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  excludeIds: Set<string>
  onPick: (noteId: string) => void
}) {
  const notes = useLiveQuery(() => db.notes.toArray(), [], [] as Note[])
  const [query, setQuery] = useState('')

  const available = sortNotes(notes.filter((n) => !excludeIds.has(n.id)))
  const q = query.trim().toLowerCase()
  const matches = q ? available.filter((n) => noteText(n).toLowerCase().includes(q)) : available

  const emptyText =
    notes.length === 0
      ? 'You have no notes yet.'
      : available.length === 0
        ? 'All your notes are already on this board.'
        : 'No notes match your search.'

  const close = () => {
    onOpenChange(false)
    setQuery('')
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Add a note to the board"
      description="Search your notes and pick one to place on the board."
    >
      {/* We filter ourselves (title and text, like the sidebar search), so cmdk only handles the keyboard navigation */}
      {/* `label` is what cmdk uses for the input's accessible name (via aria-labelledby, which beats aria-label) */}
      <Command shouldFilter={false} label="Search notes">
        <CommandInput placeholder="Search notes…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup>
            {matches.map((note) => (
              <CommandItem
                key={note.id}
                value={note.id}
                onSelect={() => {
                  close()
                  onPick(note.id)
                }}
                className="min-h-10"
              >
                <FileText className="text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{noteTitle(note)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {notePreview(note, 90) || 'Empty note'}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
