import { useState } from 'react'
import { NOTE_CARD_VIEWS, type NoteCardView } from '@/db/schema'

const KEY = 'localnotes:folderCardView'

/** How much the note cards in folder views show; remembered in this browser. */
export function useNoteCardView() {
  const [view, setView] = useState<NoteCardView>(() => {
    try {
      const saved = localStorage.getItem(KEY) as NoteCardView | null
      return saved && NOTE_CARD_VIEWS.includes(saved) ? saved : 'full'
    } catch {
      return 'full'
    }
  })
  const update = (next: NoteCardView) => {
    setView(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // per-browser convenience only
    }
  }
  return [view, update] as const
}
