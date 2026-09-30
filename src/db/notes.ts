import { nanoid } from 'nanoid'
import { db } from './db'
import type { Note } from './schema'

export async function createNote(folderId: string | null = null): Promise<string> {
  const now = Date.now()
  const note: Note = {
    id: nanoid(),
    title: '',
    content: [],
    folderId,
    // Smaller than every existing order, so new notes appear at the top of their folder
    order: -now,
    favorite: false,
    pinned: false,
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.notes.add(note)
  return note.id
}

export function updateNote(id: string, changes: Partial<Pick<Note, 'title' | 'content'>>) {
  return db.notes.update(id, { ...changes, updatedAt: Date.now() })
}

export function renameNote(id: string, title: string) {
  return updateNote(id, { title: title.trim() })
}

/** Moves a note into another folder, placing it at the top there. */
export function moveNote(id: string, folderId: string | null) {
  return db.notes.update(id, { folderId, order: -Date.now() })
}

export async function toggleFavorite(id: string) {
  const note = await db.notes.get(id)
  if (note) await db.notes.update(id, { favorite: !note.favorite })
}

export async function togglePinned(id: string) {
  const note = await db.notes.get(id)
  if (note) await db.notes.update(id, { pinned: !note.pinned })
}

export function deleteNote(id: string) {
  return db.notes.delete(id)
}

/** Pinned notes first, then most recently edited. */
export function sortNotes(notes: Note[]): Note[] {
  return sortNotesBy(notes, 'edited', 'desc')
}

/** Sidebar order: pinned notes first, then the manual (drag and drop) order. */
export function sortNotesManual(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order)
}

export type NoteSortKey = 'edited' | 'created' | 'title' | 'length'
export type SortDirection = 'desc' | 'asc'

/**
 * Pinned notes stay on top; within each group, notes are sorted by `key`.
 * `desc` means newest / Z→A / longest first.
 */
export function sortNotesBy(notes: Note[], key: NoteSortKey, direction: SortDirection): Note[] {
  const words = key === 'length' ? new Map(notes.map((n) => [n.id, noteWordCount(n)])) : null
  const value = (n: Note) => {
    switch (key) {
      case 'edited':
        return n.updatedAt
      case 'created':
        return n.createdAt
      case 'length':
        return words!.get(n.id)!
      case 'title':
        return 0
    }
  }
  const sign = direction === 'desc' ? -1 : 1
  return [...notes].sort((a, b) => {
    const pinned = Number(b.pinned) - Number(a.pinned)
    if (pinned) return pinned
    const diff =
      key === 'title'
        ? noteTitle(a).localeCompare(noteTitle(b), undefined, { sensitivity: 'base', numeric: true })
        : value(a) - value(b)
    // Ties fall back to most recently edited
    return sign * diff || b.updatedAt - a.updatedAt
  })
}

/** Number of words in the note body (title excluded). */
export function noteWordCount(note: Note): number {
  return bodyParts(note).reduce((sum, part) => sum + (part.match(/\S+/g)?.length ?? 0), 0)
}

export function noteTitle(note: Pick<Note, 'title'>) {
  return note.title.trim() || 'Untitled'
}

/** Plain text of a note (title + body), used for search. */
export function noteText(note: Note): string {
  return [note.title, ...bodyParts(note)].join(' ')
}

/** The start of a note's body as one line of plain text, for preview cards. */
export function notePreview(note: Note, maxLength = 200): string {
  const text = bodyParts(note).join(' ').replace(/\s+/g, ' ').trim()
  return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '…' : text
}

function bodyParts(note: Note): string[] {
  // One entry per block (or table cell); styled runs inside it are joined without spaces
  const parts: string[] = []
  const walk = (blocks: unknown[]) => {
    for (const block of blocks as { content?: unknown; children?: unknown[] }[]) {
      const inline: string[] = []
      collectInline(block.content, inline, parts)
      if (inline.length) parts.push(inline.join(''))
      if (block.children?.length) walk(block.children)
    }
  }
  walk(note.content)
  return parts
}

function collectInline(content: unknown, parts: string[], blockParts: string[]) {
  if (!Array.isArray(content)) {
    // Table content: { rows: [{ cells: [...] }] }; each cell becomes its own part
    const rows = (content as { rows?: { cells: unknown[] }[] } | undefined)?.rows
    rows?.forEach((row) =>
      row.cells.forEach((cell) => {
        const inline: string[] = []
        collectInline(Array.isArray(cell) ? cell : (cell as { content?: unknown }).content, inline, blockParts)
        if (inline.length) blockParts.push(inline.join(''))
      }),
    )
    return
  }
  for (const item of content as { text?: string; content?: unknown }[]) {
    if (typeof item.text === 'string') parts.push(item.text)
    else if (item.content) collectInline(item.content, parts, blockParts) // e.g. link text
  }
}
