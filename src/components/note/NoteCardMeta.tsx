import type { Note } from '@/db/schema'
import { noteWordCount } from '@/db/notes'
import { formatDate, formatDateTime, formatRelative, plural } from '@/lib/format'


/** Two fixed lines so every card's footer lines up. */
export function CardMeta({ primary, created }: { primary: React.ReactNode; created: number }) {
  return (
    <div className="mt-auto shrink-0 space-y-0.5 text-xs text-muted-foreground">
      <p className="truncate">{primary}</p>
      <p className="truncate" title={formatDateTime(created)}>
        Created {formatDate(created)}
      </p>
    </div>
  )
}

export function NoteCardMeta({ note }: { note: Note }) {
  return (
    <CardMeta
      primary={
        <>
          <span title={formatDateTime(note.updatedAt)}>Edited {formatRelative(note.updatedAt)}</span>
          {' · '}
          {plural(noteWordCount(note), 'word')}
        </>
      }
      created={note.createdAt}
    />
  )
}
