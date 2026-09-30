import Dexie, { type EntityTable } from 'dexie'
import type { Folder, Note } from './schema'

export const db = new Dexie('localnotes') as Dexie & {
  notes: EntityTable<Note, 'id'>
  folders: EntityTable<Folder, 'id'>
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
