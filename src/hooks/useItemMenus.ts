import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react'
import type { MenuEntry } from '@/components/ItemMenu'
import { db } from '@/db/db'
import { boardTitle, deleteBoard } from '@/db/boards'
import { createFolder, deleteFolder, descendantIds, moveFolder } from '@/db/folders'
import { createNote, deleteNote, moveNote, noteTitle, toggleFavorite, togglePinned } from '@/db/notes'
import { shiftFolder, shiftNote } from '@/db/order'
import type { Board, Folder, Note } from '@/db/schema'
import { useConfirm } from '@/hooks/useConfirm'
import { openFolder, openNote, useRoute } from '@/hooks/useRoute'
import { flattenFolders } from '@/lib/folder-tree'
import type { CanReorder } from '@/lib/reorder'

// Shared by sidebar rows and folder-view cards so both offer the same actions.

function useAllFolders() {
  return useLiveQuery(() => db.folders.toArray(), [], [] as Folder[])
}

/**
 * "Move to…" submenu; `exclude` hides targets that are not allowed (the folder itself and its descendants).
 * Returns nothing when there is nowhere to move to (e.g. no folders yet), so the menu doesn't offer it.
 */
function moveToEntries(
  folders: Folder[],
  current: string | null,
  onMove: (folderId: string | null) => void,
  exclude: Set<string> = new Set(),
): MenuEntry[] {
  const targets = flattenFolders(folders).filter(({ folder }) => !exclude.has(folder.id) && folder.id !== current)
  const entries: MenuEntry[] = [
    ...(current !== null ? [{ type: 'item' as const, label: 'No folder', onSelect: () => onMove(null) }] : []),
    ...targets.map(({ folder, depth }) => ({
      type: 'item' as const,
      label: folder.name,
      icon: FolderOpen,
      indent: depth,
      onSelect: () => onMove(folder.id),
    })),
  ]
  return entries.length ? [{ type: 'sub', label: 'Move to', icon: FolderInput, entries }] : []
}

/**
 * "Move up / down": the keyboard and switch-access alternative to dragging in the sidebar.
 * Only the directions that do something are offered (nothing at all for the only item in a list).
 */
function reorderEntries(shift: (delta: -1 | 1) => void, can: CanReorder | undefined): MenuEntry[] {
  return [
    ...(can?.up ? [{ type: 'item' as const, label: 'Move up', icon: ArrowUp, onSelect: () => shift(-1) }] : []),
    ...(can?.down ? [{ type: 'item' as const, label: 'Move down', icon: ArrowDown, onSelect: () => shift(1) }] : []),
  ]
}

export function useNoteMenuEntries(
  note: Note,
  {
    onRename,
    onMoved,
    reorder,
  }: {
    onRename: () => void
    onMoved?: (folderId: string | null) => void
    /** Which "Move up / down" directions are possible (only where the manual order is shown, i.e. the sidebar) */
    reorder?: CanReorder
  },
): MenuEntry[] {
  const folders = useAllFolders()
  const confirm = useConfirm()
  const route = useRoute()

  return [
    { type: 'item', label: 'Rename', icon: Pencil, onSelect: onRename },
    {
      type: 'item',
      label: note.favorite ? 'Remove from favorites' : 'Add to favorites',
      icon: note.favorite ? StarOff : Star,
      onSelect: () => toggleFavorite(note.id),
    },
    {
      type: 'item',
      label: note.pinned ? 'Unpin' : 'Pin to top',
      icon: note.pinned ? PinOff : Pin,
      onSelect: () => togglePinned(note.id),
    },
    ...moveToEntries(folders, note.folderId, (folderId) => {
      void moveNote(note.id, folderId)
      onMoved?.(folderId)
    }),
    ...reorderEntries((delta) => void shiftNote(note.id, delta), reorder),
    { type: 'separator' },
    {
      type: 'item',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: () =>
        confirm({
          title: `Delete "${noteTitle(note)}"?`,
          description: 'This note will be permanently deleted.',
          action: 'Delete',
          onConfirm: async () => {
            await deleteNote(note.id)
            if (route?.type === 'note' && route.id === note.id) openNote(null)
          },
        }),
    },
  ]
}

export function useFolderMenuEntries(
  folder: Folder,
  {
    onRename,
    onNewSubfolder = openFolder,
    onBeforeCreate,
    onMoved,
    reorder,
  }: {
    onRename: () => void
    /** Which "Move up / down" directions are possible (only in the sidebar) */
    reorder?: CanReorder
    /** What to do with a freshly created subfolder (default: open it) */
    onNewSubfolder?: (id: string) => void
    /** Called before a note/subfolder is created in this folder, e.g. to expand it in the sidebar */
    onBeforeCreate?: () => void
    onMoved?: (parentId: string | null) => void
  },
): MenuEntry[] {
  const folders = useAllFolders()
  const confirm = useConfirm()
  const route = useRoute()

  const alreadyOpen = route?.type === 'folder' && route.id === folder.id

  return [
    // Nothing to offer for the folder you are looking at
    ...(alreadyOpen ? [] : [{ type: 'item' as const, label: 'Open', icon: ExternalLink, onSelect: () => openFolder(folder.id) }]),
    { type: 'separator' },
    {
      type: 'item',
      label: 'New note',
      icon: Plus,
      onSelect: async () => {
        onBeforeCreate?.()
        openNote(await createNote(folder.id))
      },
    },
    {
      type: 'item',
      label: 'New subfolder',
      icon: FolderPlus,
      onSelect: async () => {
        onBeforeCreate?.()
        onNewSubfolder(await createFolder('New folder', folder.id))
      },
    },
    { type: 'separator' },
    { type: 'item', label: 'Rename', icon: Pencil, onSelect: onRename },
    ...moveToEntries(
      folders,
      folder.parentId,
      (parentId) => {
        void moveFolder(folder.id, parentId)
        onMoved?.(parentId)
      },
      descendantIds(folders, folder.id),
    ),
    ...reorderEntries((delta) => void shiftFolder(folder.id, delta), reorder),
    { type: 'separator' },
    {
      type: 'item',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: () =>
        confirm({
          title: `Delete folder "${folder.name}"?`,
          description: 'The folder, its subfolders and all notes inside will be permanently deleted.',
          action: 'Delete folder',
          onConfirm: async () => {
            const removed = descendantIds(await db.folders.toArray(), folder.id)
            const activeNote = route?.type === 'note' ? await db.notes.get(route.id) : undefined
            await deleteFolder(folder.id)
            // Leave the page if it was inside what we just deleted
            const insideFolder = route?.type === 'folder' && removed.has(route.id)
            const insideNote = activeNote?.folderId != null && removed.has(activeNote.folderId)
            if (insideFolder || insideNote) openNote(null)
          },
        }),
    },
  ]
}

export function useBoardMenuEntries(board: Board, { onRename }: { onRename: () => void }): MenuEntry[] {
  const confirm = useConfirm()
  const route = useRoute()

  return [
    { type: 'item', label: 'Rename', icon: Pencil, onSelect: onRename },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      onSelect: () =>
        confirm({
          title: `Delete board "${boardTitle(board)}"?`,
          description: 'The board and its layout will be permanently deleted. Your notes are not affected.',
          action: 'Delete board',
          onConfirm: async () => {
            await deleteBoard(board.id)
            if (route?.type === 'board' && route.id === board.id) openNote(null)
          },
        }),
    },
  ]
}
