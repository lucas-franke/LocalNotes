import { createContext, useContext } from 'react'
import type { Note, NoteCardView } from '@/db/schema'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** What board items need from the canvas that hosts them. */
export interface BoardContextValue {
  /** Notes referenced on this board, by id (a missing entry means the note was deleted) */
  notes: Map<string, Note>
  /** The one item being edited in place (text now, note editor in a later phase) */
  editingId: string | null
  setEditingId: (id: string | null) => void
  /** Open the note editor inside a card (zooms in first if the view is too small to type comfortably) */
  editNote: (id: string) => void
  removeNodes: (ids: string[]) => void
  /** Show one note card in another view */
  setCardView: (id: string, view: NoteCardView) => void
  /** A resize finished: store the new box */
  resizeEnd: (id: string, box: Box) => void
  /** Text item: grow the box to fit while typing (local only) */
  growText: (id: string, textarea: HTMLTextAreaElement) => void
  /** Text item: save the text (an empty text removes the item) */
  commitText: (id: string, text: string) => void
  setTextSize: (id: string, size: 's' | 'm' | 'l') => void
  /** Called when a resize starts, so outside database changes don't fight the interaction */
  beginInteraction: () => void
}

export const BoardContext = createContext<BoardContextValue | null>(null)

export function useBoard() {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoard must be used inside the board canvas')
  return ctx
}
