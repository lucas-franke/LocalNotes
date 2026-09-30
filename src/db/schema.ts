/** A BlockNote block as stored JSON; cast to BlockNote's `Block` type at the editor boundary. */
export type StoredBlock = { type: string } & Record<string, unknown>

export interface Folder {
  id: string
  name: string
  parentId: string | null
  order: number
  createdAt: number
}

export interface Note {
  id: string
  title: string
  /** BlockNote document (JSON) */
  content: StoredBlock[]
  folderId: string | null
  /** Manual position among its siblings in the sidebar (ascending; pinned notes still come first) */
  order: number
  favorite: boolean
  pinned: boolean
  /** Reserved for auto-tagging rules (not used in the UI yet) */
  tags: string[]
  createdAt: number
  updatedAt: number
}
