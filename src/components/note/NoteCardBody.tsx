import { notePreview } from '@/db/notes'
import type { Note, NoteCardView } from '@/db/schema'
import { resolveCover } from '@/lib/cover'
import { cn } from '@/lib/utils'
import { NoteCardMeta } from './NoteCardMeta'
import { NoteCover } from './NoteCover'

/**
 * What a note card shows besides its title, for each view:
 * full = cover, text and details · cover = cover (or, without one, a short text) · title = nothing.
 * The same body is used by folder cards and board cards.
 * `fill`: the card has a fixed height (board), so the cover and text take the free space.
 */
export function NoteCardBody({ note, view, fill = false }: { note: Note; view: NoteCardView; fill?: boolean }) {
  if (view === 'title') return null
  const cover = resolveCover(note)
  const preview = notePreview(note, 600)
  const emptyText = <span className="italic">Empty note</span>

  if (view === 'cover') {
    if (cover) {
      return <NoteCover cover={cover} className={cn(fill ? 'min-h-0 flex-1' : 'h-36 shrink-0')} />
    }
    // No cover to show: a short text, so the card isn't bare
    return (
      <p className={cn('line-clamp-2 px-4 pt-1 pb-3 text-sm text-muted-foreground', fill && 'min-h-0 flex-1 overflow-hidden')}>
        {preview || emptyText}
      </p>
    )
  }

  return (
    <>
      {cover && <NoteCover cover={cover} className="h-20 shrink-0" />}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 pt-2 pb-3">
        <p className={cn('min-h-0 flex-1 overflow-hidden text-sm text-muted-foreground', !fill && 'line-clamp-3')}>
          {preview || emptyText}
        </p>
        <NoteCardMeta note={note} />
      </div>
    </>
  )
}
