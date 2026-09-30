import { nanoid } from 'nanoid'
import { db } from './db'
import type { Asset } from './schema'

/** Larger images are scaled down on import to keep the database and exports reasonable. */
const MAX_SIDE = 2048
/** Used when the browser can't tell the size of an image (e.g. an SVG without dimensions). */
const FALLBACK_SIZE = { width: 300, height: 200 }
const RESIZABLE = /^image\/(png|jpeg|webp)$/ // GIFs may be animated and SVGs are vectors: stored as they are

export const isImageFile = (file: File) => file.type.startsWith('image/')

function loadImage(blob: Blob): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const url = URL.createObjectURL(blob)
  const img = new Image()
  return new Promise((resolve, reject) => {
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(url) })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This image could not be read.'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.9))
}

/**
 * Stores an image file in the assets table and returns it (with its stored size).
 * Throws an Error with a readable message for files that are not readable images.
 */
export async function addImageAsset(file: File): Promise<Asset> {
  if (!isImageFile(file)) throw new Error(`"${file.name || 'This file'}" is not an image.`)

  const { img, revoke } = await loadImage(file)
  try {
    let blob: Blob = file
    let width = img.naturalWidth || FALLBACK_SIZE.width
    let height = img.naturalHeight || FALLBACK_SIZE.height

    if (RESIZABLE.test(file.type) && Math.max(width, height) > MAX_SIDE) {
      const scale = MAX_SIDE / Math.max(width, height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      const scaled = await canvasToBlob(canvas, file.type)
      // Keep the original if scaling somehow made it bigger
      if (scaled && scaled.size < file.size) {
        blob = scaled
        width = canvas.width
        height = canvas.height
      }
    }

    const asset: Asset = {
      id: nanoid(),
      blob,
      mimeType: blob.type || file.type,
      name: file.name || 'image',
      width,
      height,
      createdAt: Date.now(),
    }
    await db.assets.add(asset)
    return asset
  } finally {
    revoke()
  }
}

/**
 * Deletes the given images unless something still uses them: an image item on a board or a note's
 * cover.
 */
export async function pruneAssets(assetIds: Iterable<string | undefined>) {
  const candidates = new Set([...assetIds].filter((id): id is string => !!id))
  if (!candidates.size) return
  await db.transaction('rw', db.boards, db.notes, db.assets, async () => {
    for (const board of await db.boards.toArray()) {
      for (const n of board.nodes) if (n.type === 'image') candidates.delete(n.assetId)
    }
    await db.notes.each((note) => {
      if (note.cover) candidates.delete(note.cover.assetId)
    })
    await db.assets.bulkDelete([...candidates])
  })
}
