import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { NoteCover } from '@/components/note/NoteCover'
import { Button } from '@/components/ui/button'
import { isImageFile } from '@/db/assets'
import { removeNoteCover, setNoteCover } from '@/db/notes'
import type { Note } from '@/db/schema'
import { cn } from '@/lib/utils'

async function choose(noteId: string, file: File | undefined) {
  if (!file) return
  try {
    await setNoteCover(noteId, file)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not set the cover.')
  }
}

/** The cover image above a note's title, with Change / Remove; an image file can be dropped on it. */
export function CoverBanner({ note }: { note: Note }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  if (!note.cover) return null
  return (
    <div
      data-testid="note-cover"
      className={cn('group/cover relative mb-6 h-48 overflow-hidden rounded-lg', over && 'ring-2 ring-ring')}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setOver(true)
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false)
        const file = [...e.dataTransfer.files].find(isImageFile)
        if (!file) return
        e.preventDefault()
        void choose(note.id, file)
      }}
    >
      <NoteCover assetId={note.cover.assetId} className="size-full" />
      <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-focus-within/cover:opacity-100 group-hover/cover:opacity-100 pointer-coarse:opacity-100">
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
          <ImagePlus /> Change cover
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void removeNoteCover(note.id)}>
          <Trash2 /> Remove
        </Button>
      </div>
      <CoverInput ref={input} noteId={note.id} />
    </div>
  )
}

/** "Add cover" for a note without one; sits just above the title and shows on hover or focus. */
export function AddCoverButton({ note }: { note: Note }) {
  const input = useRef<HTMLInputElement>(null)
  if (note.cover) return null
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="absolute -top-9 left-[54px] text-muted-foreground opacity-0 transition-none group-focus-within/title:opacity-100 group-hover/title:opacity-100 pointer-coarse:opacity-100 focus-visible:opacity-100"
        onClick={() => input.current?.click()}
      >
        <ImagePlus /> Add cover
      </Button>
      <CoverInput ref={input} noteId={note.id} />
    </>
  )
}

function CoverInput({ ref, noteId }: { ref: React.Ref<HTMLInputElement>; noteId: string }) {
  return (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      hidden
      data-testid="cover-input"
      onChange={(e) => {
        void choose(noteId, e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )
}
