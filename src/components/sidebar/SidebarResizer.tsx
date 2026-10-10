import { useState } from 'react'
import { clampSidebarWidth, SIDEBAR_MIN, sidebarMaxWidth } from '@/hooks/useSidebarWidth'

const KEY_STEP = 16

/**
 * A thin handle on the sidebar's right edge: drag to resize, arrow keys when focused, double-click to
 * go back to the default width. Only on wide screens (on a narrow screen the sidebar is an overlay).
 */
export function SidebarResizer({
  width,
  onResize,
  onCommit,
}: {
  width: number
  onResize: (width: number) => void
  onCommit: (width: number) => void
}) {
  const [dragging, setDragging] = useState(false)
  /** The width that puts the sidebar's edge under the pointer */
  const widthAt = (e: React.PointerEvent<HTMLDivElement>) =>
    e.clientX - e.currentTarget.parentElement!.getBoundingClientRect().left

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={sidebarMaxWidth()}
      aria-valuenow={width}
      tabIndex={0}
      className="group/resizer absolute inset-y-0 -right-1.5 z-20 hidden w-3 cursor-col-resize touch-none outline-none md:block"
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
      }}
      onPointerMove={(e) => {
        if (dragging) onResize(widthAt(e))
      }}
      onPointerUp={(e) => {
        setDragging(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        onCommit(widthAt(e))
      }}
      onPointerCancel={() => {
        setDragging(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }}
      onDoubleClick={() => {
        onResize(SIDEBAR_MIN)
        onCommit(SIDEBAR_MIN)
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP
        const next =
          e.key === 'ArrowRight'
            ? width + step
            : e.key === 'ArrowLeft'
              ? width - step
              : e.key === 'Home'
                ? SIDEBAR_MIN
                : e.key === 'End'
                  ? sidebarMaxWidth()
                  : null
        if (next === null) return
        e.preventDefault()
        onResize(next)
        onCommit(clampSidebarWidth(next))
      }}
    >
      {/* The visible line: only on hover, focus or while dragging */}
      <div
        className={
          'mx-auto h-full w-0.5 transition-colors group-hover/resizer:bg-ring/60 group-focus-visible/resizer:bg-ring ' +
          (dragging ? 'bg-ring' : '')
        }
      />
    </div>
  )
}
