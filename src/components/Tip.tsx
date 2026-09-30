import type { ReactElement } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Tooltip for icon-only buttons; `shortcut` is shown as a muted hint. */
export function Tip({ label, shortcut, children }: { label: string; shortcut?: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <kbd className="ml-2 font-sans opacity-70">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  )
}
