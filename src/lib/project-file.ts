import { z } from 'zod'
import { db } from '@/db/db'
import { coverAssetId, type Asset, type Board, type Folder, type Note } from '@/db/schema'

// Version 2 adds boards and the images they use; version 3 adds note covers and card views.
// Older files still import.
const FORMAT_VERSION = 3
const LAST_EXPORT_KEY = 'localnotes:lastExport'

const folderSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  parentId: z.string().nullable(),
  order: z.number(),
  createdAt: z.number(),
})

const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  // BlockNote's own format; validated structurally only
  content: z.array(z.looseObject({ type: z.string() })),
  folderId: z.string().nullable(),
  // Missing in files exported before manual ordering; filled in below
  order: z.number().optional(),
  favorite: z.boolean(),
  pinned: z.boolean(),
  tags: z.array(z.string()).default([]),
  cover: z.union([z.object({ assetId: z.string() }), z.object({ gradient: z.string() })]).nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

const nodeBase = {
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
}

const cardViewSchema = z.enum(['full', 'cover', 'title'])

const boardNodeSchema = z.discriminatedUnion('type', [
  z.object({ ...nodeBase, type: z.literal('note'),
    noteId: z.string(),
    view: cardViewSchema.optional(),
    restoreHeight: z.number().optional(),
  }),
  z.object({ ...nodeBase, type: z.literal('text'), text: z.string(), size: z.enum(['s', 'm', 'l']) }),
  z.object({ ...nodeBase, type: z.literal('image'), assetId: z.string(), alt: z.string().optional() }),
])

const boardSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
  noteView: cardViewSchema.optional(),
  nodes: z.array(boardNodeSchema),
})

/** An image in the file: the bytes as base64 text. */
const assetFileSchema = z.object({
  id: z.string().min(1),
  mimeType: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.number(),
  data: z.string(),
})

const projectSchema = z.object({
  app: z.literal('localnotes'),
  version: z.number().int().max(FORMAT_VERSION),
  exportedAt: z.number(),
  folders: z.array(folderSchema),
  notes: z.array(noteSchema),
  // Not in version 1 files
  boards: z.array(boardSchema).default([]),
  assets: z.array(assetFileSchema).default([]),
})

export type ProjectFile = {
  folders: Folder[]
  notes: Note[]
  boards: Board[]
  assets: Asset[]
  exportedAt: number
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

const boardImageIds = (boards: Board[]) =>
  boards.flatMap((b) => b.nodes.flatMap((n) => (n.type === 'image' ? [n.assetId] : [])))
const coverIds = (notes: Note[]) => notes.flatMap((n) => coverAssetId(n) ?? [])

export async function exportProject() {
  const [folders, notes, boards] = await Promise.all([db.folders.toArray(), db.notes.toArray(), db.boards.toArray()])
  // Only images that a board or a note cover still uses (removing an image from a board leaves its bytes behind)
  const used = await db.assets.bulkGet([...new Set([...boardImageIds(boards), ...coverIds(notes)])])
  const assets = await Promise.all(
    used.flatMap((a) => (a ? [a] : [])).map(async ({ blob, ...a }) => ({ ...a, data: await blobToBase64(blob) })),
  )
  const now = Date.now()
  const data = { app: 'localnotes', version: FORMAT_VERSION, exportedAt: now, folders, notes, boards, assets }
  const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = `localnotes-${new Date(now).toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(now))
  } catch {
    // storage unavailable; the hint just won't update
  }
}

export function getLastExport(): number | null {
  try {
    const value = localStorage.getItem(LAST_EXPORT_KEY)
    return value ? Number(value) : null
  } catch {
    return null
  }
}

/** Parses and validates a project file. Throws an Error with a readable message. */
export async function readProjectFile(file: File): Promise<ProjectFile> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new Error('The file is not valid JSON.')
  }
  const header = json as { app?: unknown; version?: unknown } | null
  if (header?.app === 'localnotes' && typeof header.version === 'number' && header.version > FORMAT_VERSION) {
    throw new Error('This file was created by a newer version of LocalNotes. Update the app to open it.')
  }
  const result = projectSchema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? ` (at ${issue.path.join('.')})` : ''
    throw new Error(`This is not a valid LocalNotes project file${where}.`)
  }
  const { folders, notes, boards, assets, exportedAt } = result.data
  let restored: Asset[]
  try {
    restored = assets.map(({ data, ...a }) => ({ ...a, blob: base64ToBlob(data, a.mimeType) }))
  } catch {
    throw new Error('An image in this file is damaged.')
  }
  const withOrder = notes.map((n) => ({ ...n, order: n.order ?? -n.updatedAt }))
  return { folders, notes: withOrder as Note[], boards, assets: restored, exportedAt }
}

/** "2 notes, 1 folder and 3 boards" */
export function describeProject(project: ProjectFile) {
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const parts = [count(project.notes.length, 'note'), count(project.folders.length, 'folder')]
  if (project.boards.length) parts.push(count(project.boards.length, 'board'))
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
}

export type ImportMode = 'replace' | 'merge'

export async function importProject(project: ProjectFile, mode: ImportMode) {
  await db.transaction('rw', [db.folders, db.notes, db.boards, db.assets], async () => {
    if (mode === 'replace') {
      await Promise.all([db.folders.clear(), db.notes.clear(), db.boards.clear(), db.assets.clear()])
      await db.folders.bulkAdd(project.folders)
      await db.notes.bulkAdd(project.notes)
      await db.boards.bulkAdd(project.boards)
      await db.assets.bulkAdd(project.assets)
      return
    }
    // Merge: folders are upserted; notes and boards keep whichever version was edited last
    await db.folders.bulkPut(project.folders)
    const newer = async <T extends { id: string; updatedAt: number }>(table: { bulkGet: (ids: string[]) => Promise<(T | undefined)[]> }, items: T[]) => {
      const existing = await table.bulkGet(items.map((i) => i.id))
      return items.filter((item, i) => !existing[i] || item.updatedAt > existing[i]!.updatedAt)
    }
    const notes = await newer(db.notes, project.notes)
    await db.notes.bulkPut(notes)
    const boards = await newer(db.boards, project.boards)
    await db.boards.bulkPut(boards)
    // Images are immutable: add the ones the written boards and notes use that we don't have yet
    const wanted = [...new Set([...boardImageIds(boards), ...coverIds(notes)])]
    const have = await db.assets.bulkGet(wanted)
    const missing = new Set(wanted.filter((_, i) => !have[i]))
    await db.assets.bulkAdd(project.assets.filter((a) => missing.has(a.id)))
  })
}
