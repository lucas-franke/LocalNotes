import { NodeResizer, type NodeProps } from '@xyflow/react'
import { Check, ExternalLink, FileText, MoreHorizontal, Pencil, X } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { RowDropdownMenu, type MenuEntry } from '@/components/ItemMenu'
import { Button } from '@/components/ui/button'
import { CARD_VIEW_INFO } from '@/components/note/card-views'
import { NoteCardBody } from '@/components/note/NoteCardBody'
import { noteTitle } from '@/db/notes'
import { NOTE_CARD_VIEWS, type BoardNode } from '@/db/schema'
import { openNote } from '@/hooks/useRoute'
import { cn } from '@/lib/utils'
import { useBoard } from '../board-context'
import { cardView, TITLE_HEIGHT, type BoardFlowNode } from '../flow'

// The editor is the heaviest part of the app; it is only loaded once a card is edited (or a note is opened)
const NoteEditor = lazy(() => import('@/components/editor/NoteEditor').then((m) => ({ default: m.NoteEditor })))

type NoteItem = Extract<BoardNode, { type: 'note' }>

/**
 * A live view of an existing note: title and text preview, read straight from the notes table.
 * Double-click (or the pencil) turns it into the real editor; edits are saved to the note itself, so
 * every other view of it (sidebar, folder cards, other boards) updates at once.
 */
export function NoteNode({ id, data, selected }: NodeProps<BoardFlowNode>) {
  const { noteId } = data as NoteItem
  const board = useBoard()
  const note = board.notes.get(noteId)
  const title = note ? noteTitle(note) : 'Note no longer exists'
  const editing = !!note && board.editingId === id
  const view = cardView(data as NoteItem)
  const collapsed = view === 'title' && !editing

  const entries: MenuEntry[] = [
    ...(note ? [{ type: 'item' as const, label: 'Open note', icon: ExternalLink, onSelect: () => openNote(noteId) }] : []),
    ...(note && !editing
      ? NOTE_CARD_VIEWS.filter((v) => v !== view).map((v) => ({
          type: 'item' as const,
          label: `Show ${CARD_VIEW_INFO[v].label.toLowerCase()} view`,
          icon: CARD_VIEW_INFO[v].icon,
          onSelect: () => board.setCardView(id, v),
        }))
      : []),
    { type: 'separator' },
    { type: 'item', label: 'Remove from board', icon: X, onSelect: () => board.removeNodes([id]) },
  ]

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={view === 'title' ? TITLE_HEIGHT : 120}
        maxHeight={view === 'title' ? TITLE_HEIGHT : undefined}
        onResizeStart={board.beginInteraction}
        onResizeEnd={(_, box) => board.resizeEnd(id, box)}
      />
      <div
        data-testid="board-note"
        data-editing={editing}
        className={cn(
          'flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm',
          selected && 'border-ring',
          editing && 'ring-2 ring-ring/40',
        )}
        onDoubleClick={() => note && !editing && board.editNote(id)}
      >
        <div className={cn('flex h-10 shrink-0 items-center gap-1 pr-1 pl-3', !collapsed && 'border-b')}>
          <FileText className="mr-1 size-4 shrink-0 text-muted-foreground" />
          {/* While editing, the editor's own title field is right below, so the header doesn't repeat it */}
          <span
            className={cn('min-w-0 flex-1 truncate text-sm font-medium', editing && 'text-muted-foreground')}
            data-testid="board-note-title"
          >
            {editing ? 'Editing' : title}
          </span>
          {note &&
            (editing ? (
              <Button
                variant="secondary"
                size="icon-xs"
                className="nodrag"
                aria-label="Finish editing"
                onClick={() => board.setEditingId(null)}
              >
                <Check />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-xs"
                className="nodrag"
                aria-label={`Edit ${title}`}
                onClick={() => board.editNote(id)}
              >
                <Pencil />
              </Button>
            ))}
          <RowDropdownMenu
            align="end"
            entries={entries}
            trigger={
              <Button variant="ghost" size="icon-xs" className="nodrag" aria-label={`Actions for ${title}`}>
                <MoreHorizontal />
              </Button>
            }
          />
        </div>
        {editing ? (
          // nodrag / nowheel / nopan: typing, selecting and scrolling must not move the card or the canvas.
          // Escape ends editing, except while the slash menu is open (then it just closes that menu). The
          // editor swallows Escape itself, so this listens before it (capture) and checks for the menu.
          <div
            data-testid="board-note-editor"
            className="nodrag nowheel nopan min-h-0 flex-1 overflow-y-auto"
            onKeyDownCapture={(e) => {
              if (e.key === 'Escape' && !document.querySelector('.bn-suggestion-menu')) board.setEditingId(null)
            }}
          >
            <Suspense fallback={null}>
              <NoteEditor key={note.id} note={note} embedded />
            </Suspense>
          </div>
        ) : note ? (
          <NoteCardBody note={note} view={view} fill />
        ) : (
          <p className="min-h-0 flex-1 overflow-hidden p-3 text-sm text-muted-foreground">This note was deleted.</p>
        )}
      </div>
    </>
  )
}
