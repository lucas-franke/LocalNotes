import { LayoutDashboard, MoreHorizontal } from 'lucide-react'
import { RowContextMenu, RowDropdownMenu } from '@/components/ItemMenu'
import { Button } from '@/components/ui/button'
import { boardTitle, renameBoard } from '@/db/boards'
import type { Board } from '@/db/schema'
import { useBoardMenuEntries } from '@/hooks/useItemMenus'
import { RenameInput } from './RenameInput'
import { rowActionsClass, rowClass, rowLinkClass } from './row-styles'
import { useSidebar } from './sidebar-context'

/** A board in the sidebar's "Boards" list. Not draggable: the list is flat and sorted. */
export function BoardItem({ board }: { board: Board }) {
  const { activeBoardId, renamingId, setRenamingId } = useSidebar()
  const active = board.id === activeBoardId
  const renameKey = `board:${board.id}`
  const renaming = renamingId === renameKey
  const entries = useBoardMenuEntries(board, { onRename: () => setRenamingId(renameKey) })
  const indent = { paddingLeft: '0.5rem' }

  return (
    <RowContextMenu entries={entries}>
      <div data-active={active} className={rowClass(active)}>
        {renaming ? (
          <div className="flex h-full min-w-0 flex-1 items-center gap-2" style={indent}>
            <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" />
            <RenameInput
              initial={board.title}
              onDone={(title) => {
                if (title !== null) void renameBoard(board.id, title)
                setRenamingId(null)
              }}
            />
          </div>
        ) : (
          <a
            href={`#/board/${encodeURIComponent(board.id)}`}
            aria-current={active ? 'page' : undefined}
            className={rowLinkClass}
            style={indent}
            draggable={false}
          >
            <LayoutDashboard className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{boardTitle(board)}</span>
          </a>
        )}
        <div className={rowActionsClass}>
          <RowDropdownMenu
            entries={entries}
            trigger={
              <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${boardTitle(board)}`}>
                <MoreHorizontal />
              </Button>
            }
          />
        </div>
      </div>
    </RowContextMenu>
  )
}
