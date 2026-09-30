import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { FileText, Folder as FolderIcon } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { planDrop, TreeDndContext, type DndData, type DropPlan } from '@/components/sidebar/tree-dnd'
import { noteTitle } from '@/db/notes'
import { placeFolder, placeNote } from '@/db/order'
import { DndRegistryContext, type CanvasDrop, type SidebarDnd } from './dnd-registry'

const EXPAND_DELAY = 600

/** Rows win over the areas they sit in: pick the smallest droppable under the pointer. */
const smallestUnderPointer: CollisionDetection = (args) =>
  pointerWithin(args).sort((a, b) => {
    const area = (id: typeof a.id) => {
      const rect = args.droppableRects.get(id)
      return rect ? rect.width * rect.height : Infinity
    }
    return area(a.id) - area(b.id)
  })

/** Where the pointer is now, for both mouse and touch drags. */
function pointerPosition(activatorEvent: Event | null, delta: { x: number; y: number }) {
  const start = activatorEvent as MouseEvent | TouchEvent
  const touch = 'touches' in start ? start.touches[0] : undefined
  return {
    x: (touch ? touch.clientX : (start as MouseEvent).clientX) + delta.x,
    y: (touch ? touch.clientY : (start as MouseEvent).clientY) + delta.y,
  }
}

/**
 * One drag-and-drop layer for the whole app. Sidebar rows are draggable; they can be dropped on other
 * sidebar rows (reorder / move into a folder) or on the open board's canvas (adds the note as a card).
 * The sidebar and the board register themselves in a small registry (see dnd-registry.ts).
 */
export function AppDnd({ onNoteDroppedOnCanvas, children }: { onNoteDroppedOnCanvas?: () => void; children: ReactNode }) {
  const [active, setActive] = useState<DndData | null>(null)
  const [plan, setPlan] = useState<DropPlan | null>(null)
  const expandTimer = useRef<{ id: string; timer: number } | null>(null)
  // A drag ends with a click on the row's link; swallow it so dropping doesn't navigate
  const suppressClick = useRef(false)

  const sidebar = useRef<SidebarDnd | null>(null)
  const canvas = useRef<CanvasDrop | null>(null)
  const registry = useMemo(
    () => ({
      setSidebar: (value: SidebarDnd | null) => void (sidebar.current = value),
      setCanvas: (handler: CanvasDrop | null) => void (canvas.current = handler),
    }),
    [],
  )

  const sensors = useSensors(
    // Mouse + touch rather than pointer events: with pointer events, a touch drag gets cancelled
    // as soon as the browser starts scrolling. Small threshold so plain clicks still open notes.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On touch, a short press starts the drag; swiping still scrolls the sidebar
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  const clearExpandTimer = () => {
    if (expandTimer.current) window.clearTimeout(expandTimer.current.timer)
    expandTimer.current = null
  }

  const onMove = ({ active, over, activatorEvent, delta }: DragMoveEvent) => {
    const data = active.data.current as DndData | undefined
    const overData = over?.data.current as DndData | undefined
    const side = sidebar.current
    // Nothing to plan over the canvas (or over nothing): no sidebar drop indicator
    if (!data || !over || !overData || overData.type === 'canvas' || !side) {
      setPlan(null)
      clearExpandTimer()
      return
    }
    const pointerY = pointerPosition(activatorEvent, delta).y
    const ratio = (pointerY - over.rect.top) / over.rect.height
    const next = planDrop(data, overData, ratio, side.folders, side.notes)
    setPlan((prev) =>
      prev?.indicator.id === next?.indicator.id &&
      prev?.indicator.position === next?.indicator.position &&
      prev?.index === next?.index &&
      prev?.parentId === next?.parentId
        ? prev
        : next,
    )

    // Hovering "inside" a collapsed folder opens it after a moment
    const folder =
      overData.type === 'folder' && next?.indicator.position === 'inside' && !overData.expanded ? overData.folder.id : null
    if (folder !== expandTimer.current?.id) {
      clearExpandTimer()
      if (folder) expandTimer.current = { id: folder, timer: window.setTimeout(() => side.onExpand(folder), EXPAND_DELAY) }
    }
  }

  const reset = () => {
    setActive(null)
    setPlan(null)
    clearExpandTimer()
  }

  return (
    <DndRegistryContext.Provider value={registry}>
      <DndContext
        sensors={sensors}
        collisionDetection={smallestUnderPointer}
        onDragStart={({ active }: DragStartEvent) => {
          setActive((active.data.current as DndData) ?? null)
          suppressClick.current = true
        }}
        onDragMove={onMove}
        onDragOver={onMove}
        onDragEnd={({ active, over, activatorEvent, delta }) => {
          const current = plan
          const data = active.data.current as DndData | undefined
          const overData = over?.data.current as DndData | undefined
          reset()
          if (overData?.type === 'canvas') {
            // Only notes go onto a board (a folder dropped there does nothing)
            if (data?.type === 'note' && canvas.current) {
              const { x, y } = pointerPosition(activatorEvent, delta)
              canvas.current({ noteId: data.note.id, x, y })
              onNoteDroppedOnCanvas?.()
            }
          } else if (current) {
            if (current.kind === 'note') void placeNote(current.id, current.parentId, current.index)
            else void placeFolder(current.id, current.parentId, current.index)
            if (current.parentId) sidebar.current?.onExpand(current.parentId)
          }
          // If no click follows (pointer released outside the row), stop suppressing soon after
          window.setTimeout(() => (suppressClick.current = false), 50)
        }}
        onDragCancel={reset}
      >
        <TreeDndContext.Provider value={{ indicator: plan?.indicator ?? null }}>
          {/* display: contents, so this wrapper doesn't take part in the app's layout */}
          <div
            className="contents"
            onClickCapture={(e) => {
              if (suppressClick.current) {
                e.preventDefault()
                e.stopPropagation()
                suppressClick.current = false
              }
            }}
          >
            {children}
          </div>
        </TreeDndContext.Provider>
        <DragOverlay dropAnimation={null}>
          {active && (active.type === 'note' || active.type === 'folder') && (
            <div className="flex h-9 w-56 items-center gap-2 rounded-md border bg-popover px-2.5 text-sm text-popover-foreground shadow-md">
              {active.type === 'note' ? (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{active.type === 'note' ? noteTitle(active.note) : active.folder.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </DndRegistryContext.Provider>
  )
}
