import { createContext, useContext } from 'react'
import type { Folder, Note } from '@/db/schema'

export interface SidebarContextValue {
  folders: Folder[]
  /** Notes per folder (null = not in a folder), each list already in display order */
  notesByFolder: Map<string | null, Note[]>
  activeNoteId: string | null
  activeFolderId: string | null
  activeBoardId: string | null
  expanded: Set<string>
  toggleExpanded: (id: string, open?: boolean) => void
  renamingId: string | null
  setRenamingId: (id: string | null) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used inside <Sidebar>')
  return ctx
}
