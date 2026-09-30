import type { Folder } from '@/db/schema'

export function sortFolders(folders: Folder[]) {
  return [...folders].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

/** Folders in tree order with their depth, e.g. for "Move to…" menus. */
export function flattenFolders(
  folders: Folder[],
  parentId: string | null = null,
  depth = 0,
): { folder: Folder; depth: number }[] {
  return sortFolders(folders.filter((f) => f.parentId === parentId)).flatMap((folder) => [
    { folder, depth },
    ...flattenFolders(folders, folder.id, depth + 1),
  ])
}

/** Folders from the root down to `folderId` (inclusive). */
export function folderPath(folders: Folder[], folderId: string | null): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const path: Folder[] = []
  const seen = new Set<string>()
  for (let id = folderId; id && !seen.has(id); id = byId.get(id)?.parentId ?? null) {
    seen.add(id)
    const folder = byId.get(id)
    if (folder) path.unshift(folder)
  }
  return path
}
