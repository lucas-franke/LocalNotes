import { useEffect, useRef } from 'react'
import { discardIfUntouched } from '@/db/notes'

/**
 * Call with the id of the note page that is open (or null). When you leave a note, it is discarded if
 * it is a new note that was never touched (see `discardIfUntouched`).
 *
 * The editor saves pending changes when it unmounts, and that write is queued before this check, so a
 * note you just typed into is never mistaken for an untouched one.
 */
export function useDiscardUntouchedNote(activeNoteId: string | null) {
  const previous = useRef<string | null>(null)
  useEffect(() => {
    const left = previous.current
    previous.current = activeNoteId
    if (left && left !== activeNoteId) void discardIfUntouched(left)
  }, [activeNoteId])
}
