import { z } from 'zod'
import { db } from '@/db/db'
import type { Folder, Note } from '@/db/schema'

const FORMAT_VERSION = 1
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
  createdAt: z.number(),
  updatedAt: z.number(),
})

const projectSchema = z.object({
  app: z.literal('localnotes'),
  version: z.number().int().max(FORMAT_VERSION),
  exportedAt: z.number(),
  folders: z.array(folderSchema),
  notes: z.array(noteSchema),
})

export type ProjectFile = { folders: Folder[]; notes: Note[]; exportedAt: number }

export async function exportProject() {
  const [folders, notes] = await Promise.all([db.folders.toArray(), db.notes.toArray()])
  const now = Date.now()
  const data = { app: 'localnotes', version: FORMAT_VERSION, exportedAt: now, folders, notes }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
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
  const result = projectSchema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    const where = issue?.path.length ? ` (at ${issue.path.join('.')})` : ''
    throw new Error(`This is not a valid LocalNotes project file${where}.`)
  }
  const { folders, notes, exportedAt } = result.data
  const withOrder = notes.map((n) => ({ ...n, order: n.order ?? -n.updatedAt }))
  return { folders, notes: withOrder as Note[], exportedAt }
}

export type ImportMode = 'replace' | 'merge'

export async function importProject(project: ProjectFile, mode: ImportMode) {
  await db.transaction('rw', db.folders, db.notes, async () => {
    if (mode === 'replace') {
      await db.folders.clear()
      await db.notes.clear()
      await db.folders.bulkAdd(project.folders)
      await db.notes.bulkAdd(project.notes)
      return
    }
    // Merge: folders are upserted, notes keep whichever version was edited last
    await db.folders.bulkPut(project.folders)
    const existing = new Map(
      (await db.notes.bulkGet(project.notes.map((n) => n.id))).map((n, i) => [project.notes[i].id, n]),
    )
    const toWrite = project.notes.filter((n) => {
      const current = existing.get(n.id)
      return !current || n.updatedAt > current.updatedAt
    })
    await db.notes.bulkPut(toWrite)
  })
}

