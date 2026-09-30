import { ChevronRight, Folder as FolderIcon, FolderOpen, MoreHorizontal, Plus } from 'lucide-react'
import { RowContextMenu, RowDropdownMenu } from '@/components/ItemMenu'
import { Button } from '@/components/ui/button'
import { renameFolder } from '@/db/folders'
import { createNote, sortNotesManual } from '@/db/notes'
import type { Folder } from '@/db/schema'
import { useFolderMenuEntries } from '@/hooks/useItemMenus'
import { openNote } from '@/hooks/useRoute'
import { sortFolders } from '@/lib/folder-tree'
import { cn } from '@/lib/utils'
import { NoteItem } from './NoteItem'
import { RenameInput } from './RenameInput'
import { rowActionsClass, rowClass, rowLinkClass } from './row-styles'
import { useSidebar } from './sidebar-context'
import { DropLine } from './TreeDnd'
import { dndId, useTreeItem } from './tree-dnd'

export function FolderTree({ parentId = null, depth = 0 }: { parentId?: string | null; depth?: number }) {
  const { folders } = useSidebar()
  const children = sortFolders(folders.filter((f) => f.parentId === parentId))
  return children.map((folder) => <FolderItem key={folder.id} folder={folder} depth={depth} />)
}

function FolderItem({ folder, depth }: { folder: Folder; depth: number }) {
  const { folders, notesByFolder, activeFolderId, expanded, toggleExpanded, renamingId, setRenamingId } =
    useSidebar()
  const open = expanded.has(folder.id)
  const active = folder.id === activeFolderId
  const notes = sortNotesManual(notesByFolder.get(folder.id) ?? [])
  const hasChildren = notes.length > 0 || folders.some((f) => f.parentId === folder.id)
  const expand = () => toggleExpanded(folder.id, true)

  const entries = useFolderMenuEntries(folder, {
    onRename: () => setRenamingId(folder.id),
    onBeforeCreate: expand,
    // In the sidebar a new subfolder is named inline right away
    onNewSubfolder: (id) => setRenamingId(id),
    onMoved: (parentId) => parentId && toggleExpanded(parentId, true),
    reorder: true,
  })
  const { setNodeRef, listeners, isDragging, indicator } = useTreeItem(
    dndId('folder', folder.id),
    { type: 'folder', folder, expanded: open, hasChildren },
    { disabled: renamingId === folder.id },
  )
  const indentLeft = `${0.25 + depth * 0.75}rem`

  const Icon = open ? FolderOpen : FolderIcon

  return (
    <>
      <RowContextMenu entries={entries}>
        <div
          ref={setNodeRef}
          {...listeners}
          data-active={active}
          className={rowClass(active, indicator === 'inside', isDragging)}
          style={{ paddingLeft: indentLeft }}
        >
          <DropLine position={indicator} indent={indentLeft} />
          <button
            type="button"
            onClick={() => toggleExpanded(folder.id)}
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${folder.name}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ChevronRight
              className={cn('size-4 motion-safe:transition-transform', open && 'rotate-90', !hasChildren && 'opacity-50')}
            />
          </button>
          {renamingId === folder.id ? (
            <div className="flex h-full min-w-0 flex-1 items-center gap-2">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <RenameInput
                initial={folder.name}
                onDone={(name) => {
                  if (name !== null) void renameFolder(folder.id, name)
                  setRenamingId(null)
                }}
              />
            </div>
          ) : (
            <a
              href={`#/folder/${encodeURIComponent(folder.id)}`}
              aria-current={active ? 'page' : undefined}
              className={rowLinkClass}
              draggable={false}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
            </a>
          )}
          <div className={rowActionsClass}>
            <RowDropdownMenu
              entries={entries}
              trigger={
                <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${folder.name}`}>
                  <MoreHorizontal />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={async () => {
                expand()
                openNote(await createNote(folder.id))
              }}
              aria-label={`New note in ${folder.name}`}
            >
              <Plus />
            </Button>
          </div>
        </div>
      </RowContextMenu>
      {open && (
        <>
          <FolderTree parentId={folder.id} depth={depth + 1} />
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} depth={depth + 1} />
          ))}
          {!hasChildren && (
            <div
              className="flex h-9 items-center text-xs text-muted-foreground"
              style={{ paddingLeft: `${2 + (depth + 1) * 0.75}rem` }}
            >
              Empty
            </div>
          )}
        </>
      )}
    </>
  )
}
