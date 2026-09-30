import { db } from './db'
import { descendantIds } from './folders'
import { sortNotesManual } from './notes'
import { sortFolders } from '@/lib/folder-tree'

// Manual ordering for the sidebar. Each placement rewrites the orders of the affected siblings
// to 0…n, so values never drift or collide no matter how often items are dragged around.

/**
 * Moves a note into `folderId` at `index`, counted in the sidebar's visible order of that
 * folder's notes (without the moved note). Pinned notes still sort first.
 */
export async function placeNote(id: string, folderId: string | null, index: number) {
  await db.transaction('rw', db.notes, async () => {
    const note = await db.notes.get(id)
    if (!note) return
    const siblings = sortNotesManual(
      await db.notes.filter((n) => n.folderId === folderId && n.id !== id).toArray(),
    )
    siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, { ...note, folderId })
    await Promise.all(
      siblings.map((n, order) =>
        n.id === id
          ? db.notes.update(id, { folderId, order })
          : n.order !== order && db.notes.update(n.id, { order }),
      ),
    )
  })
}

/** Moves a folder into `parentId` at `index` among its subfolders. Refuses to create cycles. */
export async function placeFolder(id: string, parentId: string | null, index: number) {
  await db.transaction('rw', db.folders, async () => {
    const all = await db.folders.toArray()
    const folder = all.find((f) => f.id === id)
    if (!folder || (parentId && descendantIds(all, id).has(parentId))) return
    const siblings = sortFolders(all.filter((f) => f.parentId === parentId && f.id !== id))
    siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, { ...folder, parentId })
    await Promise.all(
      siblings.map((f, order) =>
        f.id === id
          ? db.folders.update(id, { parentId, order })
          : f.order !== order && db.folders.update(f.id, { order }),
      ),
    )
  })
}

/** Keyboard/menu alternative to dragging: move one step up (-1) or down (+1) among siblings. */
export async function shiftNote(id: string, delta: -1 | 1) {
  const note = await db.notes.get(id)
  if (!note) return
  const siblings = sortNotesManual(await db.notes.filter((n) => n.folderId === note.folderId).toArray())
  const index = siblings.findIndex((n) => n.id === id)
  const target = index + delta
  // Stay within the pinned / unpinned group the note belongs to
  if (target < 0 || target >= siblings.length || siblings[target].pinned !== note.pinned) return
  await placeNote(id, note.folderId, target)
}

export async function shiftFolder(id: string, delta: -1 | 1) {
  const all = await db.folders.toArray()
  const folder = all.find((f) => f.id === id)
  if (!folder) return
  const siblings = sortFolders(all.filter((f) => f.parentId === folder.parentId))
  const target = siblings.findIndex((f) => f.id === id) + delta
  if (target < 0 || target >= siblings.length) return
  await placeFolder(id, folder.parentId, target)
}
