import '@xyflow/react/dist/style.css'
import { useDroppable } from '@dnd-kit/core'
import {
  Background,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { nanoid } from 'nanoid'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useRegisterCanvasDrop } from '@/components/dnd/dnd-registry'
import type { DndData } from '@/components/sidebar/tree-dnd'
import { addImageAsset, isImageFile } from '@/db/assets'
import { updateBoard } from '@/db/boards'
import { db } from '@/db/db'
import { CardViewToggle } from '@/components/note/CardViewToggle'
import type { Board, BoardNode, Note, NoteCardView } from '@/db/schema'
import { cn } from '@/lib/utils'
import { BoardContext, type Box } from './board-context'
import { BoardFab } from './BoardFab'
import { NodeSearch } from './NodeSearch'
import { ZoomSlider } from './ZoomSlider'
import { TITLE_HEIGHT, DEFAULT_CARD_HEIGHT, toBoardNode, toFlowNode, withCardView, type BoardFlowNode } from './flow'
import { ImageNode } from './nodes/ImageNode'
import { NoteNode } from './nodes/NoteNode'
import { TextNode } from './nodes/TextNode'

const nodeTypes = { note: NoteNode, text: TextNode, image: ImageNode }
const NO_NOTES = new Map<string, Note>()

/** The board canvas. Loaded lazily, so React Flow is its own chunk. */
export default function BoardPage({ board }: { board: Board }) {
  return (
    <ReactFlowProvider>
      <Canvas board={board} />
    </ReactFlowProvider>
  )
}

/*
 * State model (see the spike findings in the plan):
 *  - The database is the source of truth; React Flow runs controlled with a local copy of the nodes.
 *  - Every save is computed from an explicit next state (never from a ref that may lag a render).
 *  - Changes arriving from the database are applied only while nothing is being dragged, resized or
 *    typed; if one arrives in between, it is applied as soon as the interaction ends.
 */
function Canvas({ board }: { board: Board }) {
  const { resolvedTheme } = useTheme()
  const [nodes, setNodes] = useState<BoardFlowNode[]>(() => board.nodes.map(toFlowNode))
  const [interacting, setInteracting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [seededAt, setSeededAt] = useState(board.updatedAt)

  // Database → canvas, keeping the selection. (Render-time update: the documented way to derive state from props.)
  if (seededAt !== board.updatedAt && !interacting && editingId === null) {
    setSeededAt(board.updatedAt)
    setNodes((prev) =>
      board.nodes.map((n) => ({ ...toFlowNode(n), selected: prev.find((p) => p.id === n.id)?.selected })),
    )
  }

  const rf = useReactFlow()
  const container = useRef<HTMLDivElement | null>(null)
  // The canvas is a drop target for notes dragged from the sidebar (see AppDnd)
  const { setNodeRef: setDropRef, isOver, active: dragged } = useDroppable({
    id: 'canvas',
    data: { type: 'canvas' } satisfies DndData,
  })
  const noteOver = isOver && dragged?.data.current?.type === 'note'
  const [filesOver, setFilesOver] = useState(false)
  const nodesRef = useRef(nodes)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  /** Shows the new state at once and saves it; the interaction ends when the save is done. */
  const commit = useCallback(
    async (next: BoardFlowNode[], extra: { noteView?: NoteCardView } = {}) => {
      nodesRef.current = next // synchronously, so a second add before the next render builds on this one
      setNodes(next)
      try {
        await updateBoard(board.id, { nodes: next.map(toBoardNode), ...extra })
      } finally {
        setInteracting(false)
      }
    },
    [board.id],
  )

  const commitMoved = useCallback(
    (moved: BoardFlowNode[]) => {
      const positions = new Map(moved.map((n) => [n.id, n.position]))
      void commit(nodesRef.current.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)! } : n)))
    },
    [commit],
  )

  const removeNodes = useCallback(
    (ids: string[]) => void commit(nodesRef.current.filter((n) => !ids.includes(n.id))),
    [commit],
  )

  const resizeEnd = useCallback(
    (id: string, box: Box) =>
      void commit(
        nodesRef.current.map((n) =>
          n.id === id ? { ...n, position: { x: box.x, y: box.y }, width: box.width, height: box.height } : n,
        ),
      ),
    [commit],
  )

  const noteView = board.noteView ?? 'full'

  const setCardView = useCallback(
    (id: string, view: NoteCardView) =>
      void commit(nodesRef.current.map((n) => (n.id === id ? withCardView(n, view) : n))),
    [commit],
  )

  /** The toolbar: every note card switches, and new cards start in this view */
  const setAllCardViews = useCallback(
    (view: NoteCardView) => void commit(nodesRef.current.map((n) => withCardView(n, view)), { noteView: view }),
    [commit],
  )

  const withData = (n: BoardFlowNode, patch: Partial<Extract<BoardNode, { type: 'text' }>>): BoardFlowNode => ({
    ...n,
    data: { ...n.data, ...patch } as BoardNode,
  })

  const growText = useCallback((id: string, textarea: HTMLTextAreaElement) => {
    // Measure what the text needs (auto height), and only ever grow the box while typing
    textarea.style.height = 'auto'
    const needed = Math.ceil(textarea.scrollHeight) + 16
    textarea.style.height = ''
    setNodes((ns) => ns.map((n) => (n.id === id && (n.height ?? 0) < needed ? { ...n, height: needed } : n)))
  }, [])

  const commitText = useCallback(
    (id: string, text: string) => {
      setEditingId(null)
      void commit(
        text.trim() === ''
          ? nodesRef.current.filter((n) => n.id !== id) // an empty annotation is removed
          : nodesRef.current.map((n) => (n.id === id ? withData(n, { text }) : n)),
      )
    },
    [commit],
  )

  const setTextSize = useCallback(
    (id: string, size: 's' | 'm' | 'l') =>
      void commit(nodesRef.current.map((n) => (n.id === id ? withData(n, { size }) : n))),
    [commit],
  )

  // ---- adding items ----------------------------------------------------------------------

  const viewportCenter = useCallback((): XYPosition => {
    const r = container.current!.getBoundingClientRect()
    return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }, [rf])

  /** Top-left for a new item, centered on `at` (default: the middle of the view) and nudged so it never lands exactly on another item. */
  const place = useCallback(
    (size: { width: number; height: number }, at?: XYPosition) => {
      const center = at ?? viewportCenter()
      let x = center.x - size.width / 2
      let y = center.y - size.height / 2
      while (nodesRef.current.some((n) => Math.abs(n.position.x - x) < 12 && Math.abs(n.position.y - y) < 12)) {
        x += 24
        y += 24
      }
      return { x, y }
    },
    [viewportCenter],
  )

  /** Adds an item, selects it (and only it). Text items are not saved until they have text. */
  const addNode = useCallback(
    (node: BoardNode, { persist = true } = {}) => {
      const next = [
        ...nodesRef.current.map((n) => (n.selected ? { ...n, selected: false } : n)),
        { ...toFlowNode(node), selected: true },
      ]
      if (persist) void commit(next)
      else {
        nodesRef.current = next
        setNodes(next)
      }
    },
    [commit],
  )

  /** Selects an item (only it) and zooms to it, also when it is far outside the view. */
  const focusNode = useCallback(
    (id: string) => {
      setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })))
      void rf.fitView({ nodes: [{ id }], duration: 300, padding: 0.4, maxZoom: 1 })
    },
    [rf],
  )

  const addNote = useCallback(
    (noteId: string, at?: XYPosition) => {
      const existing = nodesRef.current.find((n) => n.data.type === 'note' && n.data.noteId === noteId)
      if (existing) {
        // One card per note per board: show the one that is already there
        focusNode(existing.id)
        return
      }
      const collapsed = noteView === 'title'
      const size = { width: 300, height: collapsed ? TITLE_HEIGHT : DEFAULT_CARD_HEIGHT }
      addNode({
        id: nanoid(),
        type: 'note',
        noteId,
        ...(noteView === 'full' ? {} : { view: noteView }),
        ...(collapsed ? { restoreHeight: DEFAULT_CARD_HEIGHT } : {}),
        ...place(size, at),
        ...size,
      })
    },
    [addNode, place, focusNode, noteView],
  )

  const addText = useCallback(
    (at?: XYPosition) => {
      const size = { width: 240, height: 48 }
      const id = nanoid()
      addNode({ id, type: 'text', text: '', size: 'm', ...place(size, at), ...size }, { persist: false })
      setEditingId(id)
    },
    [addNode, place],
  )

  const addImages = useCallback(
    async (files: File[], at?: XYPosition) => {
      for (const file of files) {
        try {
          const asset = await addImageAsset(file)
          // Show at most 320 px on the long side (and at least 96, so tiny icons can still be grabbed)
          const side = Math.max(asset.width, asset.height)
          const scale = Math.min(Math.max(side, 96), 320) / side
          const size = { width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) }
          addNode({ id: nanoid(), type: 'image', assetId: asset.id, ...place(size, at), ...size })
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not add the image.')
        }
      }
    },
    [addNode, place],
  )

  useRegisterCanvasDrop(({ noteId, x, y }) => addNote(noteId, rf.screenToFlowPosition({ x, y })))

  // Paste images with Ctrl+V (unless the user is typing somewhere)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, [contenteditable="true"]')) return
      const files = [...(e.clipboardData?.files ?? [])].filter(isImageFile)
      if (!files.length) return
      e.preventDefault()
      void addImages(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addImages])

  // Referenced notes: one query for the whole board, so a rename or edit anywhere updates every card
  const idsKey = useMemo(
    () => [...new Set(nodes.flatMap((n) => (n.data.type === 'note' ? [n.data.noteId] : [])))].sort().join(','),
    [nodes],
  )
  const notes = useLiveQuery(
    async () => {
      const found = await db.notes.bulkGet(idsKey ? idsKey.split(',') : [])
      return new Map(found.flatMap((n) => (n ? [[n.id, n] as const] : [])))
    },
    [idsKey],
    NO_NOTES,
  )

  const noteIdsOnBoard = useMemo(() => new Set(idsKey ? idsKey.split(',') : []), [idsKey])

  // Only one editor is live at a time; opening one from a very zoomed-out view zooms in so it is readable
  const editNote = useCallback(
    (id: string) => {
      let node = nodesRef.current.find((n) => n.id === id)
      // The editor needs room: a collapsed card opens up first
      if (node?.data.type === 'note' && node.data.view === 'title') {
        node = withCardView(node, 'full')
        void commit(nodesRef.current.map((n) => (n.id === id ? node! : n)))
      }
      setEditingId(id)
      if (node && rf.getZoom() < 0.75) {
        void rf.setCenter(node.position.x + (node.width ?? 300) / 2, node.position.y + (node.height ?? 200) / 2, {
          zoom: 1,
          duration: 200,
        })
      }
    },
    [rf, commit],
  )

  const context = useMemo(
    () => ({
      notes,
      editingId,
      setEditingId,
      editNote,
      removeNodes,
      setCardView,
      resizeEnd,
      growText,
      commitText,
      setTextSize,
      beginInteraction: () => setInteracting(true),
    }),
    [notes, editingId, editNote, removeNodes, setCardView, resizeEnd, growText, commitText, setTextSize],
  )

  return (
    <BoardContext.Provider value={context}>
      <div
        ref={(el) => {
          container.current = el
          setDropRef(el)
        }}
        data-testid="board-page"
        data-board-id={board.id}
        className={cn('relative h-full w-full', (filesOver || noteOver) && 'ring-2 ring-ring/60 ring-inset')}
        // Images dragged in from the desktop (notes dragged from the sidebar are handled separately)
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setFilesOver(true)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFilesOver(false)
        }}
        onDrop={(e) => {
          setFilesOver(false)
          const files = [...e.dataTransfer.files].filter(isImageFile)
          if (!files.length) return
          e.preventDefault()
          void addImages(files, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }))
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={nodeTypes}
          onNodesChange={(changes: NodeChange<BoardFlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns))}
          onNodeDragStart={() => setInteracting(true)}
          onNodeDragStop={(_, __, dragged) => commitMoved(dragged)}
          onSelectionDragStart={() => setInteracting(true)}
          onSelectionDragStop={(_, dragged) => commitMoved(dragged)}
          // React Flow has already applied the removal locally; save the remaining nodes explicitly
          onNodesDelete={(deleted) => removeNodes(deleted.map((n) => n.id))}
          // Clicking anywhere else ends in-place editing (a click inside the edited card does not)
          onPaneClick={() => setEditingId(null)}
          onNodeClick={(_, node) => editingId && node.id !== editingId && setEditingId(null)}
          deleteKeyCode={['Backspace', 'Delete']}
          onMoveEnd={(_, viewport) => void updateBoard(board.id, { viewport })}
          defaultViewport={board.viewport}
          minZoom={0.1}
          maxZoom={2}
          zoomOnDoubleClick={false}
          onlyRenderVisibleElements
          colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
          attributionPosition="bottom-left"
        >
          <Background gap={20} size={1} />
          <ZoomSlider />
          {nodes.length > 0 && <NodeSearch nodes={nodes} notes={notes} onFind={focusNode} />}
          <Panel position="top-right">
            <CardViewToggle value={noteView} onChange={setAllCardViews} label="View of all note cards" />
          </Panel>
        </ReactFlow>
        <BoardFab
          empty={nodes.length === 0}
          excludeNoteIds={noteIdsOnBoard}
          onPickNote={(noteId) => addNote(noteId)}
          onAddText={() => addText()}
          onAddImages={(files) => void addImages(files)}
        />
      </div>
    </BoardContext.Provider>
  )
}
