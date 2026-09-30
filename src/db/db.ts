import Dexie, { type EntityTable } from 'dexie'
import type { Asset, Board, Folder, Note } from './schema'

export const db = new Dexie('localnotes') as Dexie & {
  notes: EntityTable<Note, 'id'>
  folders: EntityTable<Folder, 'id'>
  boards: EntityTable<Board, 'id'>
  assets: EntityTable<Asset, 'id'>
}

db.version(1).stores({
  notes: 'id, folderId, favorite, pinned, updatedAt',
  folders: 'id, parentId',
})

// v2: manual note order. Existing notes keep their previous order (most recently edited first).
db.version(2)
  .stores({
    notes: 'id, folderId, favorite, pinned, updatedAt',
    folders: 'id, parentId',
  })
  .upgrade((tx) =>
    tx
      .table('notes')
      .toCollection()
      .modify((note: Note) => {
        if (typeof note.order !== 'number') note.order = -note.updatedAt
      }),
  )

// v3: boards (infinite canvas) and the image bytes they use. Purely additive, notes and folders stay as they are.
db.version(3).stores({
  boards: 'id, createdAt',
  assets: 'id',
})
