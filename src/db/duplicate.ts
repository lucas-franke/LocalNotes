import { nanoid } from 'nanoid'
import { defaultGradient } from '@/lib/gradients'
import { sortFolders } from '@/lib/folder-tree'
import { db } from './db'
import { descendantIds } from './folders'
import { noteTitle, sortNotesManual } from './notes'
import { placeFolder, placeNote } from './order'
import type { Note } from './schema'

/**
 * A copy of a note with a new id, the same content, cover, tags and place. Not favorited (the copy is
 * a new thing); pinned like the original. Cover images are shared by id, which is safe: an image is
 * only removed once no note cover and no board uses it any more.
 */
function copyOfNote(note: Note, overrides: Partial<Note> = {}): Note {
  const now = Date.now()
  return {
    ...structuredClone(note),
    id: nanoid(),
    favorite: false,
    // Keep the look: a note without a stored cover shows a gradient derived from its id, which a copy would not share
    cover: note.cover === undefined ? { gradient: defaultGradient(note.id).id } : note.cover,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Duplicates a note; the copy is called "<title> (copy)" and sits right below the original. Returns its id. */
export function duplicateNote(id: string): Promise<string | undefined> {
  return db.transaction('rw', db.notes, async () => {
    const note = await db.notes.get(id)
    if (!note) return undefined
    const copy = copyOfNote(note, { title: `${noteTitle(note)} (copy)` })
    await db.notes.add(copy)
    const siblings = sortNotesManual(await db.notes.filter((n) => n.folderId === note.folderId).toArray())
    // placeNote renumbers the siblings; the copy goes right after the original
    await placeNote(copy.id, note.folderId, siblings.filter((n) => n.id !== copy.id).findIndex((n) => n.id === id) + 1)
    return copy.id
  })
}

/**
 * Duplicates a folder with everything in it (subfolders and notes). The top folder is called
 * "<name> (copy)" and sits right below the original. Returns its id.
 */
export function duplicateFolder(id: string): Promise<string | undefined> {
  return db.transaction('rw', db.folders, db.notes, async () => {
    const folders = await db.folders.toArray()
    const root = folders.find((f) => f.id === id)
    if (!root) return undefined
    const ids = descendantIds(folders, id)
    const newIds = new Map([...ids].map((old) => [old, nanoid()]))
    const now = Date.now()

    await db.folders.bulkAdd(
      folders
        .filter((f) => ids.has(f.id))
        .map((f) => ({
          ...f,
          id: newIds.get(f.id)!,
          parentId: f.id === id ? f.parentId : newIds.get(f.parentId!)!,
          name: f.id === id ? `${f.name} (copy)` : f.name,
          createdAt: now,
        })),
    )
    const notes = await db.notes.where('folderId').anyOf([...ids]).toArray()
    await db.notes.bulkAdd(notes.map((n) => copyOfNote(n, { folderId: newIds.get(n.folderId!)! })))

    const siblings = sortFolders(folders.filter((f) => f.parentId === root.parentId))
    await placeFolder(newIds.get(id)!, root.parentId, siblings.findIndex((f) => f.id === id) + 1)
    return newIds.get(id)
  })
}
