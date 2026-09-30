import { FileText, MoreHorizontal, Pin } from 'lucide-react'
import { RowContextMenu, RowDropdownMenu } from '@/components/ItemMenu'
import { Button } from '@/components/ui/button'
import { noteTitle, renameNote } from '@/db/notes'
import type { Note } from '@/db/schema'
import { useNoteMenuEntries } from '@/hooks/useItemMenus'
import { canReorderNote } from '@/lib/reorder'
import { cn } from '@/lib/utils'
import { RenameInput } from './RenameInput'
import { rowActionsClass, rowClass, rowLinkClass, rowStatusClass } from './row-styles'
import { useSidebar } from './sidebar-context'
import { DropLine } from './DropLine'
import { dndId, useTreeItem } from './tree-dnd'

export function NoteItem({
  note,
  depth = 0,
  hint,
  section = 'tree',
}: {
  note: Note
  depth?: number
  hint?: string
  /** Which list the row is in; a note can appear in several (e.g. Favorites and its folder) */
  section?: string
}) {
  const { activeNoteId, notesByFolder, toggleExpanded, renamingId, setRenamingId } = useSidebar()
  const active = note.id === activeNoteId
  const renameKey = `${section}:${note.id}`
  const renaming = renamingId === renameKey

  const entries = useNoteMenuEntries(note, {
    onRename: () => setRenamingId(renameKey),
    onMoved: (folderId) => folderId && toggleExpanded(folderId, true),
    // Only rows in the folder tree / "Notes" list have a manual order to move within
    reorder: section === 'tree' ? canReorderNote(notesByFolder.get(note.folderId) ?? [], note) : undefined,
  })
  // Inside the tree, line the icon up with sibling folder icons (which sit after a 1.75rem chevron)
  const indentLeft = depth === 0 ? '0.5rem' : `${2 + depth * 0.75}rem`
  const indent = { paddingLeft: indentLeft }

  // Every row can be dragged (e.g. onto a board), but only rows in the folder tree / "Notes" list are
  // targets for reordering; Favorites and search results show a different order.
  const { setNodeRef, listeners, isDragging, indicator } = useTreeItem(
    section === 'tree' ? dndId('note', note.id) : `${section}:${note.id}`,
    { type: 'note', note },
    { dragDisabled: renaming, dropDisabled: section !== 'tree' || renaming },
  )

  return (
    <RowContextMenu entries={entries}>
      <div
        ref={setNodeRef}
        {...listeners}
        data-active={active}
        className={rowClass(active, false, isDragging)}
      >
        <DropLine position={indicator} indent={indentLeft} />
        {renaming ? (
          <div className="flex h-full min-w-0 flex-1 items-center gap-2" style={indent}>
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <RenameInput
              initial={note.title}
              onDone={(title) => {
                if (title !== null) void renameNote(note.id, title)
                setRenamingId(null)
              }}
            />
          </div>
        ) : (
          <a
            href={`#/note/${encodeURIComponent(note.id)}`}
            aria-current={active ? 'page' : undefined}
            className={rowLinkClass}
            style={indent}
            // The row is dragged with dnd-kit; stop the browser's own link dragging
            draggable={false}
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              {noteTitle(note)}
              {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
            </span>
            {note.pinned && (
              <Pin className={cn('mr-1 size-3.5 shrink-0 text-muted-foreground', rowStatusClass)} aria-label="Pinned" />
            )}
          </a>
        )}
        <div className={rowActionsClass}>
          <RowDropdownMenu
            entries={entries}
            trigger={
              <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${noteTitle(note)}`}>
                <MoreHorizontal />
              </Button>
            }
          />
        </div>
      </div>
    </RowContextMenu>
  )
}
