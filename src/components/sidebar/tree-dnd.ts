import { useDraggable, useDroppable } from '@dnd-kit/core'
import { createContext, useContext } from 'react'
import { descendantIds } from '@/db/folders'
import { sortNotesManual } from '@/db/notes'
import type { Folder, Note } from '@/db/schema'
import { sortFolders } from '@/lib/folder-tree'

export type ItemKind = 'note' | 'folder'
export type DropPosition = 'before' | 'after' | 'inside'

/** What is attached to each draggable / droppable via dnd-kit's `data`. */
export type DndData =
  | { type: 'note'; note: Note }
  | { type: 'folder'; folder: Folder; expanded: boolean; hasChildren: boolean }
  | { type: 'section'; section: 'folders' | 'notes' }

/** Where the dragged item would land, plus which element shows the indicator. */
export interface DropPlan {
  kind: ItemKind
  id: string
  parentId: string | null
  index: number
  indicator: { id: string; position: DropPosition }
}

export const dndId = (kind: ItemKind | 'section', id: string) => `${kind}:${id}`

/**
 * Works out the drop for the dragged item over `over`, with `ratio` = pointer's vertical
 * position within the target row (0 = top, 1 = bottom). Returns null for invalid drops.
 */
export function planDrop(
  active: DndData,
  over: DndData,
  ratio: number,
  folders: Folder[],
  notes: Note[],
): DropPlan | null {
  const notesIn = (folderId: string | null, except?: string) =>
    sortNotesManual(notes.filter((n) => n.folderId === folderId && n.id !== except))
  const foldersIn = (parentId: string | null, except?: string) =>
    sortFolders(folders.filter((f) => f.parentId === parentId && f.id !== except))

  if (active.type === 'note') {
    const id = active.note.id
    if (over.type === 'note') {
      if (over.note.id === id) return null
      const position = ratio < 0.5 ? 'before' : 'after'
      const siblings = notesIn(over.note.folderId, id)
      const at = siblings.findIndex((n) => n.id === over.note.id)
      return {
        kind: 'note',
        id,
        parentId: over.note.folderId,
        index: position === 'before' ? at : at + 1,
        indicator: { id: dndId('note', over.note.id), position },
      }
    }
    if (over.type === 'folder') {
      // Notes dropped on a folder go inside, at the top
      return { kind: 'note', id, parentId: over.folder.id, index: 0, indicator: { id: dndId('folder', over.folder.id), position: 'inside' } }
    }
    if (over.section === 'notes') {
      return { kind: 'note', id, parentId: null, index: notesIn(null, id).length, indicator: { id: dndId('section', 'notes'), position: 'inside' } }
    }
    return null
  }

  if (active.type === 'folder') {
    const id = active.folder.id
    const forbidden = descendantIds(folders, id) // itself and everything inside it
    if (over.type === 'folder') {
      const target = over.folder
      if (forbidden.has(target.id)) return null
      // Expanded folders with children: the bottom edge sits above their first child, so it means "inside, first"
      const bottomMeansInside = over.expanded && over.hasChildren
      const position: DropPosition =
        ratio < 0.3 ? 'before' : ratio > 0.7 && !bottomMeansInside ? 'after' : 'inside'
      if (position === 'inside') {
        const index = ratio > 0.7 ? 0 : foldersIn(target.id, id).length
        return { kind: 'folder', id, parentId: target.id, index, indicator: { id: dndId('folder', target.id), position } }
      }
      const siblings = foldersIn(target.parentId, id)
      const at = siblings.findIndex((f) => f.id === target.id)
      return {
        kind: 'folder',
        id,
        parentId: target.parentId,
        index: position === 'before' ? at : at + 1,
        indicator: { id: dndId('folder', target.id), position },
      }
    }
    if (over.type === 'note') {
      // Over a note: into that note's folder, after its subfolders
      const parentId = over.note.folderId
      if (parentId === null || forbidden.has(parentId)) return null
      return { kind: 'folder', id, parentId, index: foldersIn(parentId, id).length, indicator: { id: dndId('folder', parentId), position: 'inside' } }
    }
    if (over.section === 'folders') {
      return { kind: 'folder', id, parentId: null, index: foldersIn(null, id).length, indicator: { id: dndId('section', 'folders'), position: 'inside' } }
    }
  }
  return null
}

export const TreeDndContext = createContext<{ indicator: DropPlan['indicator'] | null }>({ indicator: null })

/** Drop indicator for the element with this dnd id, if it is the current target. */
export function useDropIndicator(id: string): DropPosition | null {
  const { indicator } = useContext(TreeDndContext)
  return indicator?.id === id ? indicator.position : null
}

/** Makes a sidebar row both draggable and a drop target. */
export function useTreeItem(id: string, data: DndData, { disabled = false } = {}) {
  const drag = useDraggable({ id, data, disabled })
  const drop = useDroppable({ id, data, disabled })
  return {
    setNodeRef: (el: HTMLElement | null) => {
      drag.setNodeRef(el)
      drop.setNodeRef(el)
    },
    // Only pointer listeners: keyboard users reorder via the "Move up/down" menu entries,
    // so the row doesn't get an extra tab stop from dnd-kit's attributes.
    listeners: drag.listeners,
    isDragging: drag.isDragging,
    indicator: useDropIndicator(id),
  }
}
