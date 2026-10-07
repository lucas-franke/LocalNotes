import { nanoid } from 'nanoid'
import { addImageAsset, pruneAssets } from './assets'
import { db } from './db'
import { coverAssetId, type Note } from './schema'

/**
 * Notes created in this session, with the state they were created in. Leaving one that is still
 * exactly like that discards it (see `discardIfUntouched`), so "New note" followed by clicking
 * somewhere else doesn't leave an empty "Untitled" behind. Session-only on purpose: a note from an
 * earlier session is never removed automatically.
 */
const freshNotes = new Map<string, { folderId: string | null; order: number }>()

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
  freshNotes.set(note.id, { folderId, order: note.order })
  return note.id
}

/**
 * Deletes a note created in this session if the user left it exactly as it was created: no title, no
 * content, never edited, not pinned/favorited/moved, and not used on any board. Anything the user did
 * to it (even typing and deleting again) means it is kept. Only gets one chance per note.
 */
export async function discardIfUntouched(id: string) {
  const created = freshNotes.get(id)
  if (!created) return
  freshNotes.delete(id)
  await db.transaction('rw', db.notes, db.boards, async () => {
    const note = await db.notes.get(id)
    if (!note) return
    const untouched =
      note.title === '' &&
      note.content.length === 0 &&
      note.updatedAt === note.createdAt &&
      note.folderId === created.folderId &&
      note.order === created.order &&
      !note.favorite &&
      !note.pinned &&
      note.tags.length === 0 &&
      note.cover === undefined
    if (!untouched) return
    const usedOnBoard = (await db.boards.toArray()).some((b) => b.nodes.some((n) => n.type === 'note' && n.noteId === id))
    if (!usedOnBoard) await db.notes.delete(id)
  })
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
  return deleteNotes([id])
}

/** Deletes notes, their cards on every board and their cover images. */
export async function deleteNotes(ids: string[]) {
  await db.transaction('rw', db.notes, db.boards, db.assets, async () => {
    const gone = new Set(ids)
    const covers = (await db.notes.bulkGet(ids)).map((n) => coverAssetId(n))
    await db.notes.bulkDelete(ids)
    for (const board of await db.boards.toArray()) {
      const nodes = board.nodes.filter((n) => !(n.type === 'note' && gone.has(n.noteId)))
      if (nodes.length !== board.nodes.length) await db.boards.update(board.id, { nodes, updatedAt: Date.now() })
    }
    await pruneAssets(covers)
  })
}

/** Sets (or replaces) the cover image of a note. Counts as an edit. */
export async function setNoteCover(id: string, file: File) {
  const asset = await addImageAsset(file)
  const old = coverAssetId(await db.notes.get(id))
  await db.notes.update(id, { cover: { assetId: asset.id }, updatedAt: Date.now() })
  // If the note was deleted meanwhile, the new image has no user and is removed again
  await pruneAssets([old, asset.id])
}

/** Picks a gradient from the palette as the cover (replacing an image). */
export async function setNoteGradient(id: string, gradient: string) {
  const old = coverAssetId(await db.notes.get(id))
  await db.notes.update(id, { cover: { gradient }, updatedAt: Date.now() })
  await pruneAssets([old])
}

/** No cover at all (not even a generated gradient). */
export async function removeNoteCover(id: string) {
  const old = coverAssetId(await db.notes.get(id))
  await db.notes.update(id, { cover: null, updatedAt: Date.now() })
  await pruneAssets([old])
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
