import { createContext, useContext, useEffect } from 'react'
import type { Folder, Note } from '@/db/schema'

/** What the sidebar tells the app-level drag layer, so it can plan and commit sidebar drops. */
export interface SidebarDnd {
  folders: Folder[]
  notes: Note[]
  /** Expand a folder (while hovering a collapsed one, and after dropping into it) */
  onExpand: (folderId: string) => void
}

/** A note was dropped on the canvas at this screen position. */
export type CanvasDrop = (drop: { noteId: string; x: number; y: number }) => void

/** Provided by <AppDnd>: the sidebar and the open board register themselves through these setters. */
export interface DndRegistry {
  setSidebar: (value: SidebarDnd | null) => void
  setCanvas: (handler: CanvasDrop | null) => void
}

export const DndRegistryContext = createContext<DndRegistry | null>(null)

function useRegistry() {
  const registry = useContext(DndRegistryContext)
  if (!registry) throw new Error('Drag and drop registration needs <AppDnd> above it')
  return registry
}

/** The sidebar registers itself (with its current folders and notes) whenever it renders. */
export function useRegisterSidebarDnd(value: SidebarDnd) {
  const { setSidebar } = useRegistry()
  useEffect(() => {
    setSidebar(value)
    return () => setSidebar(null)
  })
}

/** The open board registers how to place a dropped note. */
export function useRegisterCanvasDrop(handler: CanvasDrop) {
  const { setCanvas } = useRegistry()
  useEffect(() => {
    setCanvas(handler)
    return () => setCanvas(null)
  })
}
