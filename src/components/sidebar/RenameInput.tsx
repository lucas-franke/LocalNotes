import { useEffect, useRef, useState } from 'react'

/** Inline name editor: Enter/blur saves, Escape cancels (onDone(null)). */
export function RenameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  const finish = (name: string | null) => {
    if (done.current) return
    done.current = true
    onDone(name)
  }

  useEffect(() => {
    // Delay so the closing menu doesn't steal focus back
    const t = window.setTimeout(() => ref.current?.select(), 50)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(value)
        if (e.key === 'Escape') finish(null)
      }}
      className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  )
}
