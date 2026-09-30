import { useDroppable } from '@dnd-kit/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { FolderPlus, PanelLeftClose, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { db } from '@/db/db'
import { createFolder } from '@/db/folders'
import { createNote, noteText, sortNotes, sortNotesManual } from '@/db/notes'
import type { Folder, Note } from '@/db/schema'
import { openNote, useActiveFolderId, useActiveNoteId } from '@/hooks/useRoute'
import { BackupMenu } from './BackupMenu'
import { FolderTree } from './FolderTree'
import { NoteItem } from './NoteItem'
import { SidebarContext, type SidebarContextValue } from './sidebar-context'
import { TreeDnd } from './TreeDnd'
import { dndId, useDropIndicator } from './tree-dnd'
import { cn } from '@/lib/utils'

const EXPANDED_KEY = 'localnotes:expanded'
const NOT_LOADED: Folder[] = []

function loadExpanded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function Sidebar({
  onCollapse,
  focusSearch,
}: {
  onCollapse: () => void
  /** Changes whenever the search field should receive focus (Ctrl+K) */
  focusSearch: number
}) {
  const folders = useLiveQuery(() => db.folders.toArray(), [], NOT_LOADED)
  const foldersLoaded = folders !== NOT_LOADED
  const notes = useLiveQuery(() => db.notes.toArray(), [], [] as Note[])
  const activeNoteId = useActiveNoteId()
  const activeFolderId = useActiveFolderId()

  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(loadExpanded)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusSearch) searchInput.current?.select()
  }, [focusSearch])

  const toggleExpanded = useCallback((id: string, open?: boolean) => {
    setExpanded((prev) => {
      const shouldOpen = open ?? !prev.has(id)
      if (shouldOpen === prev.has(id)) return prev
      const next = new Set(prev)
      if (shouldOpen) next.add(id)
      else next.delete(id)
      try {
        localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]))
      } catch {
        // per-browser convenience only
      }
      return next
    })
  }, [])

  // Read folders through a ref so edits (e.g. a rename) don't re-expand folders the user collapsed
  const foldersRef = useRef(folders)
  useEffect(() => {
    foldersRef.current = folders
  }, [folders])
  const expandPath = useCallback(
    (folderId: string | null) => {
      const seen = new Set<string>()
      const parentOf = (id: string) => foldersRef.current.find((f) => f.id === id)?.parentId ?? null
      for (let id = folderId; id && !seen.has(id); id = parentOf(id)) {
        seen.add(id)
        toggleExpanded(id, true)
      }
    },
    [toggleExpanded],
  )

  // Reveal the open page: expand the folders leading to it and scroll its row into view
  const revealFolderId = activeFolderId ?? notes.find((n) => n.id === activeNoteId)?.folderId ?? null
  useEffect(() => {
    if (!foldersLoaded) return
    expandPath(revealFolderId)
    const frame = requestAnimationFrame(() =>
      document.querySelector('aside [data-active="true"]')?.scrollIntoView({ block: 'nearest' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [revealFolderId, activeNoteId, foldersLoaded, expandPath])

  const notesByFolder = useMemo(() => {
    const map = new Map<string | null, Note[]>()
    for (const note of notes) map.set(note.folderId, [...(map.get(note.folderId) ?? []), note])
    return map
  }, [notes])

  const ctx: SidebarContextValue = {
    folders,
    notesByFolder,
    activeNoteId,
    activeFolderId,
    expanded,
    toggleExpanded,
    renamingId,
    setRenamingId,
  }

  const q = query.trim().toLowerCase()
  const results = q ? sortNotes(notes.filter((n) => noteText(n).toLowerCase().includes(q))) : []
  const favorites = sortNotes(notes.filter((n) => n.favorite))
  const unfiled = sortNotesManual(notesByFolder.get(null) ?? [])
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name

  return (
    <SidebarContext.Provider value={ctx}>
      <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-1 py-2 pr-2 pl-4">
          <span className="flex-1 text-sm font-semibold tracking-tight">LocalNotes</span>
          <ThemeToggle />
          <Tip label="Hide sidebar" shortcut="Ctrl \">
            <Button variant="ghost" size="icon-sm" onClick={onCollapse} aria-label="Hide sidebar">
              <PanelLeftClose />
            </Button>
          </Tip>
        </div>

        <div className="space-y-1 px-2 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInput}
              type="search"
              aria-label="Search notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              placeholder="Search"
              className="h-9 w-full rounded-md bg-sidebar-accent/70 pr-9 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  searchInput.current?.focus()
                }}
                className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-sidebar px-1.5 font-sans text-[11px] text-muted-foreground pointer-coarse:hidden"
              >
                Ctrl K
              </kbd>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2.5"
            onClick={async () => openNote(await createNote())}
          >
            <Plus /> New note
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label="Notes and folders" className="px-2 pb-4">
            {q ? (
              <Section title={`${results.length} result${results.length === 1 ? '' : 's'}`}>
                {results.map((note) => (
                  <NoteItem key={note.id} note={note} hint={folderName(note.folderId)} section="search" />
                ))}
              </Section>
            ) : (
              <TreeDnd folders={folders} notes={notes} onExpand={(id) => toggleExpanded(id, true)}>
                {favorites.length > 0 && (
                  <Section title="Favorites">
                    {favorites.map((note) => (
                      <NoteItem key={note.id} note={note} hint={folderName(note.folderId)} section="favorites" />
                    ))}
                  </Section>
                )}
                <Section
                  title="Folders"
                  drop="folders"
                  action={
                    <Tip label="New folder">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={async () => setRenamingId(await createFolder('New folder'))}
                        aria-label="New folder"
                      >
                        <FolderPlus />
                      </Button>
                    </Tip>
                  }
                >
                  {folders.length ? <FolderTree /> : <EmptyHint>No folders yet</EmptyHint>}
                </Section>
                <Section title="Notes" drop="notes">
                  {unfiled.length ? (
                    unfiled.map((note) => <NoteItem key={note.id} note={note} />)
                  ) : (
                    <EmptyHint>No notes outside folders</EmptyHint>
                  )}
                </Section>
              </TreeDnd>
            )}
          </nav>
        </ScrollArea>

        <div className="border-t p-2">
          <BackupMenu hasNotes={notes.length > 0} />
        </div>
      </aside>
    </SidebarContext.Provider>
  )
}

function Section({
  title,
  action,
  drop,
  children,
}: {
  title: string
  action?: ReactNode
  /** Makes the section a drop zone for moving items to the top level */
  drop?: 'folders' | 'notes'
  children: ReactNode
}) {
  const id = dndId('section', drop ?? title)
  const { setNodeRef } = useDroppable({ id, data: { type: 'section', section: drop }, disabled: !drop })
  const highlighted = useDropIndicator(id) === 'inside'
  return (
    <section ref={setNodeRef} className={cn('mt-4 rounded-md', highlighted && 'bg-sidebar-accent/60 ring-2 ring-primary/50')}>
      <div className="flex h-7 items-center justify-between pr-1 pl-2">
        <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        {action}
      </div>
      {/* Some empty space at the end, so there's always room to drop at the top level */}
      <div className={cn('space-y-px', drop && 'pb-2')}>{children}</div>
    </section>
  )
}

function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="px-2 py-2 text-xs text-muted-foreground">{children}</p>
}
