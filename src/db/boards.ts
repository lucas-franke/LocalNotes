import { nanoid } from 'nanoid'
import { pruneAssets } from './assets'
import { db } from './db'
import type { Board } from './schema'

export async function createBoard(): Promise<string> {
  const now = Date.now()
  const board: Board = {
    id: nanoid(),
    title: '',
    createdAt: now,
    updatedAt: now,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
  }
  await db.boards.add(board)
  return board.id
}

export function renameBoard(id: string, title: string) {
  return db.boards.update(id, { title: title.trim(), updatedAt: Date.now() })
}

/**
 * Saves layout changes. Only a change to the items counts as an edit (`updatedAt`);
 * panning and zooming just remember where you were.
 */
export function updateBoard(id: string, changes: Partial<Pick<Board, 'nodes' | 'viewport' | 'noteView'>>) {
  return db.boards.update(id, 'nodes' in changes ? { ...changes, updatedAt: Date.now() } : changes)
}

/** Deletes a board and the images only it uses. Notes are never touched. */
export async function deleteBoard(id: string) {
  await db.transaction('rw', db.boards, db.notes, db.assets, async () => {
    const board = await db.boards.get(id)
    if (!board) return
    await db.boards.delete(id)
    await pruneAssets(board.nodes.map((n) => (n.type === 'image' ? n.assetId : undefined)))
  })
}

export function boardTitle(board: Pick<Board, 'title'>) {
  return board.title.trim() || 'Untitled board'
}

/** Newest first, like new notes. Stable while you work (unlike sorting by last edit). */
export function sortBoards(boards: Board[]): Board[] {
  return [...boards].sort((a, b) => b.createdAt - a.createdAt)
}
