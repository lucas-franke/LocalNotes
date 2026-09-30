import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type MenuEntry =
  | { type: 'item'; label: string; icon?: LucideIcon; onSelect: () => void; destructive?: boolean; indent?: number }
  | { type: 'separator' }
  | { type: 'sub'; label: string; icon?: LucideIcon; entries: MenuEntry[] }

const parts = {
  context: {
    Item: ContextMenuItem,
    Separator: ContextMenuSeparator,
    Sub: ContextMenuSub,
    SubTrigger: ContextMenuSubTrigger,
    SubContent: ContextMenuSubContent,
  },
  dropdown: {
    Item: DropdownMenuItem,
    Separator: DropdownMenuSeparator,
    Sub: DropdownMenuSub,
    SubTrigger: DropdownMenuSubTrigger,
    SubContent: DropdownMenuSubContent,
  },
}

function Entries({ entries, kind }: { entries: MenuEntry[]; kind: keyof typeof parts }) {
  const P = parts[kind]
  return entries.map((entry, i) => {
    if (entry.type === 'separator') return <P.Separator key={i} />
    if (entry.type === 'sub') {
      return (
        <P.Sub key={i}>
          <P.SubTrigger>
            {entry.icon && <entry.icon />}
            {entry.label}
          </P.SubTrigger>
          <P.SubContent className="max-h-80 overflow-y-auto">
            <Entries entries={entry.entries} kind={kind} />
          </P.SubContent>
        </P.Sub>
      )
    }
    return (
      <P.Item
        key={i}
        variant={entry.destructive ? 'destructive' : 'default'}
        onSelect={entry.onSelect}
        style={entry.indent ? { paddingLeft: `${0.5 + entry.indent * 0.75}rem` } : undefined}
      >
        {entry.icon && <entry.icon />}
        {entry.label}
      </P.Item>
    )
  })
}

/**
 * Menus return focus to their trigger when closing. Skip that when the chosen action already
 * moved focus into a text field (e.g. an inline rename input), or it would be blurred right away.
 */
function keepMovedFocus(event: Event) {
  const el = document.activeElement as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) event.preventDefault()
}

/** Wraps a row with a right-click menu; the same entries can be shown in a "…" dropdown. */
export function RowContextMenu({ entries, children }: { entries: MenuEntry[]; children: ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56" onCloseAutoFocus={keepMovedFocus}>
        <Entries entries={entries} kind="context" />
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function RowDropdownMenu({
  entries,
  trigger,
  align = 'start',
}: {
  entries: MenuEntry[]
  trigger: ReactNode
  align?: 'start' | 'end'
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56" onCloseAutoFocus={keepMovedFocus}>
        <Entries entries={entries} kind="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
