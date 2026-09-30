import { nanoid } from 'nanoid'
import { db } from './db'
import type { Folder } from './schema'

export async function createFolder(name: string, parentId: string | null = null): Promise<string> {
  const folder: Folder = {
    id: nanoid(),
    name: name.trim() || 'New folder',
    parentId,
    order: await nextFolderOrder(parentId),
    createdAt: Date.now(),
  }
  await db.folders.add(folder)
  return folder.id
}

/** An order value after all current subfolders of `parentId` (new folders go to the bottom). */
async function nextFolderOrder(parentId: string | null) {
  // null isn't indexable in IndexedDB, so filter instead of using the index
  const siblings = await db.folders.filter((f) => f.parentId === parentId).toArray()
  return siblings.reduce((max, f) => Math.max(max, f.order + 1), 0)
}

export function renameFolder(id: string, name: string) {
  return db.folders.update(id, { name: name.trim() || 'Untitled folder' })
}

/** IDs of the folder and all of its descendants. */
export function descendantIds(folders: Folder[], id: string): Set<string> {
  const ids = new Set([id])
  let added = true
  while (added) {
    added = false
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        added = true
      }
    }
  }
  return ids
}

export async function moveFolder(id: string, parentId: string | null) {
  const all = await db.folders.toArray()
  if (parentId && descendantIds(all, id).has(parentId)) return // no cycles
  await db.folders.update(id, { parentId, order: await nextFolderOrder(parentId) })
}

/** Deletes the folder, its subfolders and all notes inside them. */
export async function deleteFolder(id: string) {
  await db.transaction('rw', db.folders, db.notes, async () => {
    const ids = [...descendantIds(await db.folders.toArray(), id)]
    await db.notes.where('folderId').anyOf(ids).delete()
    await db.folders.bulkDelete(ids)
  })
}
