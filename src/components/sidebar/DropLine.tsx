/** Line above or below a row showing where the dragged item will be inserted. */
export function DropLine({ position, indent }: { position: 'before' | 'after' | 'inside' | null; indent: string }) {
  if (position !== 'before' && position !== 'after') return null
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute right-1 h-0.5 rounded-full bg-primary ${position === 'before' ? '-top-px' : '-bottom-px'}`}
      style={{ left: indent }}
    />
  )
}
