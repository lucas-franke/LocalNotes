import { useLiveQuery } from 'dexie-react-hooks'
import { FilePlus, PanelLeftOpen } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { BoardBreadcrumb } from '@/components/board/BoardBreadcrumb'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { AppDnd } from '@/components/dnd/AppDnd'
import { FolderView } from '@/components/folder/FolderView'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'
import { boardTitle } from '@/db/boards'
import { db } from '@/db/db'
import { createNote, noteTitle } from '@/db/notes'
import { useDiscardUntouchedNote } from '@/hooks/useDiscardUntouchedNote'
import { openNote, useRoute, type RouteType } from '@/hooks/useRoute'

// The editor is the bulk of the bundle; load it separately so the shell appears fast
const NoteEditor = lazy(() =>
  import('@/components/editor/NoteEditor').then((m) => ({ default: m.NoteEditor })),
)

// The canvas (React Flow) is its own chunk, loaded only when a board is opened
const BoardPage = lazy(() => import('@/components/board/BoardPage'))

const isNarrow = () => window.matchMedia('(max-width: 767px)').matches
const LOADING = Symbol('loading')

export default function App() {
  const route = useRoute()
  // A new note that was left untouched isn't kept when you move on
  useDiscardUntouchedNote(route?.type === 'note' ? route.id : null)
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow())
  // Bumped by Ctrl+K; the sidebar focuses its search field whenever this changes
  const [focusSearch, setFocusSearch] = useState(0)
  // useLiveQuery keeps returning the previous result while a new route's query runs, so each
  // result carries the route it belongs to. Otherwise the old note's editor would briefly stay
  // on screen under the new URL, and anything typed in that moment would land in the wrong note.
  const routeKey = route ? `${route.type}:${route.id}` : ''
  const page = useLiveQuery(
    async () => ({
      key: routeKey,
      note: route?.type === 'note' ? await db.notes.get(route.id) : undefined,
      folder: route?.type === 'folder' ? await db.folders.get(route.id) : undefined,
      board: route?.type === 'board' ? await db.boards.get(route.id) : undefined,
    }),
    [routeKey],
    LOADING,
  )
  const loading = page === LOADING || page.key !== routeKey
  const note = loading ? undefined : page.note
  const folder = loading ? undefined : page.folder
  const board = loading ? undefined : page.board
  const current = loading
    ? undefined
    : note
      ? { type: 'note' as const, note }
      : folder
        ? { type: 'folder' as const, folder }
        : board
          ? { type: 'board' as const, board }
          : undefined

  // On small screens the sidebar is an overlay; close it once a page is opened
  useEffect(() => {
    if (route && isNarrow()) setSidebarOpen(false)
  }, [route])

  // New notes go into the folder you're looking at (or the current note's folder)
  const newNoteFolderId =
    current?.type === 'note' ? current.note.folderId : current?.type === 'folder' ? current.folder.id : null

  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openNote(await createNote(newNoteFolderId))
      } else if (mod && e.key === '\\') {
        e.preventDefault()
        setSidebarOpen((open) => !open)
      } else if (mod && !e.altKey && e.key.toLowerCase() === 'k') {
        // Leave Ctrl+K to the editor when text is selected there (it creates a link)
        const inEditor = (e.target as HTMLElement | null)?.closest?.('.bn-editor')
        if (inEditor && !window.getSelection()?.isCollapsed) return
        e.preventDefault()
        setSidebarOpen(true)
        setFocusSearch((n) => n + 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [newNoteFolderId])

  return (
    // On a narrow screen the sidebar covers the board, so close it once a note has been dropped there
    <AppDnd onNoteDroppedOnCanvas={() => isNarrow() && setSidebarOpen(false)}>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        {sidebarOpen && (
          <>
            <div className="fixed inset-y-0 left-0 z-40 md:static md:z-auto">
              <Sidebar onCollapse={() => setSidebarOpen(false)} focusSearch={focusSearch} />
            </div>
            <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
          </>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {/* The visible titles are editable inputs, so give the page a real heading for screen readers */}
          <h1 className="sr-only">
            {current?.type === 'note'
              ? noteTitle(current.note)
              : current?.type === 'folder'
                ? current.folder.name
                : current?.type === 'board'
                  ? boardTitle(current.board)
                  : 'LocalNotes'}
          </h1>
          <header className="flex h-12 shrink-0 items-center gap-1 px-3 text-sm">
            {!sidebarOpen && (
              <Tip label="Show sidebar" shortcut="Ctrl \">
                <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)} aria-label="Show sidebar">
                  <PanelLeftOpen />
                </Button>
              </Tip>
            )}
            {current?.type === 'note' && (
              <Breadcrumbs folderId={current.note.folderId} current={noteTitle(current.note)} />
            )}
            {current?.type === 'folder' && (
              <Breadcrumbs folderId={current.folder.parentId} current={current.folder.name} />
            )}
            {current?.type === 'board' && <BoardBreadcrumb board={current.board} />}
          </header>

          {/* Boards are full-bleed and pan/zoom themselves, so the page itself must not scroll */}
          <div className={current?.type === 'board' ? 'min-h-0 flex-1 overflow-hidden' : 'min-h-0 flex-1 overflow-y-auto'}>
            {loading ? null : current?.type === 'note' ? (
              <Suspense fallback={null}>
                <NoteEditor key={current.note.id} note={current.note} />
              </Suspense>
            ) : current?.type === 'folder' ? (
              <FolderView key={current.folder.id} folder={current.folder} />
            ) : current?.type === 'board' ? (
              <Suspense fallback={null}>
                <BoardPage key={current.board.id} board={current.board} />
              </Suspense>
            ) : (
              <EmptyState missing={route?.type ?? null} />
            )}
          </div>
        </main>
      </div>
    </AppDnd>
  )
}

function EmptyState({ missing }: { missing: RouteType | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {missing ? `This ${missing} no longer exists.` : 'Select a note or create a new one.'}
      </p>
      <Button variant="outline" onClick={async () => openNote(await createNote())}>
        <FilePlus /> New note
      </Button>
      <p className="text-xs text-muted-foreground">
        Shortcut: <kbd className="font-sans">Ctrl</kbd> + <kbd className="font-sans">Alt</kbd> +{' '}
        <kbd className="font-sans">N</kbd> · Type <kbd className="font-sans">/</kbd> in a note for blocks
      </p>
    </div>
  )
}
