import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { NOTE_CARD_VIEWS, type NoteCardView } from '@/db/schema'
import { cn } from '@/lib/utils'
import { CARD_VIEW_INFO } from './card-views'

/** Segmented control for how much of a note its card shows. */
export function CardViewToggle({
  value,
  onChange,
  label,
  className,
}: {
  value: NoteCardView
  onChange: (view: NoteCardView) => void
  label: string
  className?: string
}) {
  return (
    <div role="group" aria-label={label} className={cn('nodrag flex rounded-lg border bg-background p-0.5', className)}>
      {NOTE_CARD_VIEWS.map((view) => {
        const { label: name, hint, icon: Icon } = CARD_VIEW_INFO[view]
        return (
          <Tip key={view} label={`${name}: ${hint}`}>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={name}
              aria-pressed={value === view}
              className={cn('size-8', value === view ? 'bg-accent text-foreground' : 'text-muted-foreground')}
              onClick={() => onChange(view)}
            >
              <Icon className="size-4" />
            </Button>
          </Tip>
        )
      })}
    </div>
  )
}
