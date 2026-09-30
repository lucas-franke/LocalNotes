import type { Node } from '@xyflow/react'
import type { BoardNode, NoteCardView } from '@/db/schema'

/**
 * A React Flow node whose `data` is the board node itself. Position and size live on the
 * React Flow node while interacting; `data.x/y/width/height` are stale and overwritten on save.
 */
export type BoardFlowNode = Node<BoardNode>

export function toFlowNode(n: BoardNode): BoardFlowNode {
  return { id: n.id, type: n.type, position: { x: n.x, y: n.y }, width: n.width, height: n.height, data: n }
}

export function toBoardNode(n: BoardFlowNode): BoardNode {
  return {
    ...n.data,
    x: n.position.x,
    y: n.position.y,
    width: n.width ?? n.measured?.width ?? n.data.width,
    height: n.height ?? n.measured?.height ?? n.data.height,
  }
}

/** Height of a note card in the 'title' view: just its header (40px) plus the border */
export const TITLE_HEIGHT = 42
/** Height a collapsed card gets back when it has no remembered one */
export const DEFAULT_CARD_HEIGHT = 200

export function cardView(n: BoardNode): NoteCardView {
  return n.type === 'note' ? (n.view ?? 'full') : 'full'
}

/**
 * The node switched to another card view. Title cards collapse to their header and remember their
 * height so the card comes back the same size; other nodes are returned unchanged.
 */
export function withCardView(n: BoardFlowNode, view: NoteCardView): BoardFlowNode {
  const data = n.data
  if (data.type !== 'note' || cardView(data) === view) return n
  const { restoreHeight, ...rest } = data
  const height = n.height ?? n.measured?.height ?? data.height
  const next = { ...rest, view: view === 'full' ? undefined : view }
  if (view === 'title') {
    return { ...n, height: TITLE_HEIGHT, data: { ...next, restoreHeight: height } as BoardNode }
  }
  return {
    ...n,
    height: cardView(data) === 'title' ? (restoreHeight ?? DEFAULT_CARD_HEIGHT) : height,
    data: next as BoardNode,
  }
}
