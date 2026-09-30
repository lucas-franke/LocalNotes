import { cn } from '@/lib/utils'

/** Sidebar row: 36px tall, whole row highlights on hover. */
export const rowClass = (active: boolean, dropInside = false, dragging = false) =>
  cn(
    'group/row relative flex h-9 items-center gap-0.5 rounded-md pr-1 text-sm text-sidebar-foreground hover:bg-sidebar-accent',
    active && 'bg-sidebar-accent font-medium',
    // Drop target for "inside" and the row being dragged (its preview follows the pointer)
    dropInside && 'bg-sidebar-accent ring-2 ring-primary/50',
    dragging && 'opacity-40',
  )

/** The link filling a row; focus ring for keyboard users. */
export const rowLinkClass =
  'flex h-full min-w-0 flex-1 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60'

/** Row actions stay reachable: shown on hover, keyboard focus, touch screens, or while their menu is open. */
export const rowActionsClass =
  'hidden shrink-0 items-center group-hover/row:flex group-focus-within/row:flex pointer-coarse:flex has-data-[state=open]:flex'

/** Status icons (e.g. pin) give way to the actions. */
export const rowStatusClass = 'group-hover/row:hidden group-focus-within/row:hidden pointer-coarse:hidden'
