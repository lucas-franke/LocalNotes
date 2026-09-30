import type { Folder, Note } from '@/db/schema'
import { sortFolders } from './folder-tree'

/** Which "Move up / down" directions actually do something for a row. */
export interface CanReorder {
  up: boolean
  down: boolean
}

/**
 * `siblings` must be in display order (pinned first, then manual order). A note can't be moved past
 * the boundary between pinned and unpinned notes, mirroring `shiftNote`.
 */
export function canReorderNote(siblings: Note[], note: Note): CanReorder {
  const at = siblings.findIndex((n) => n.id === note.id)
  if (at < 0) return { up: false, down: false }
  return {
    up: at > 0 && siblings[at - 1].pinned === note.pinned,
    down: at < siblings.length - 1 && siblings[at + 1].pinned === note.pinned,
  }
}

/** Mirrors `shiftFolder`: folders move among the subfolders of the same parent. */
export function canReorderFolder(folders: Folder[], folder: Folder): CanReorder {
  const siblings = sortFolders(folders.filter((f) => f.parentId === folder.parentId))
  const at = siblings.findIndex((f) => f.id === folder.id)
  return { up: at > 0, down: at >= 0 && at < siblings.length - 1 }
}
