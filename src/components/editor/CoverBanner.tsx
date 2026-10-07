import { Check, ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { NoteCover } from '@/components/note/NoteCover'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isImageFile } from '@/db/assets'
import { removeNoteCover, setNoteCover, setNoteGradient } from '@/db/notes'
import type { Note } from '@/db/schema'
import { resolveCover } from '@/lib/cover'
import { COVER_GRADIENTS, gradientCss } from '@/lib/gradients'
import { cn } from '@/lib/utils'

async function chooseImage(noteId: string, file: File | undefined) {
  if (!file) return
  try {
    await setNoteCover(noteId, file)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not set the cover.')
  }
}

/**
 * Menu to pick the cover: a gradient from the palette, an image from the computer, or no cover.
 * `children` is the trigger button. The (hidden) file input lives here so it survives the menu closing.
 */
function CoverMenu({ note, children }: { note: Note; children: ReactNode }) {
  const input = useRef<HTMLInputElement>(null)
  const current = resolveCover(note)
  const currentGradient = current?.kind === 'gradient' ? current.id : null
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Gradient</DropdownMenuLabel>
          <div className="grid grid-cols-5 gap-2 p-1.5">
            {COVER_GRADIENTS.map((g) => (
              <DropdownMenuItem
                key={g.id}
                aria-label={g.name}
                title={g.name}
                data-gradient={g.id}
                className="size-10 justify-center rounded-lg p-0 text-white focus:text-white"
                style={{ backgroundImage: gradientCss(g) }}
                onSelect={() => void setNoteGradient(note.id, g.id)}
              >
                {currentGradient === g.id && <Check className="size-4 drop-shadow" />}
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => input.current?.click()}>
            <ImagePlus /> Upload image…
          </DropdownMenuItem>
          {current && (
            <DropdownMenuItem onSelect={() => void removeNoteCover(note.id)}>
              <Trash2 /> Remove cover
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        data-testid="cover-input"
        onChange={(e) => {
          void chooseImage(note.id, e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}

/** The cover above a note's title; click it to change it (gradient, image or remove). Image files can be dropped on it. */
export function CoverBanner({ note }: { note: Note }) {
  const [over, setOver] = useState(false)
  const cover = resolveCover(note)
  if (!cover) return null
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
        void chooseImage(note.id, file)
      }}
    >
      <NoteCover cover={cover} className="size-full" />
      <CoverMenu note={note}>
        <button
          type="button"
          aria-label="Change cover"
          className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      </CoverMenu>
      <div className="pointer-events-none absolute right-2 bottom-2 flex gap-1 opacity-0 group-focus-within/cover:opacity-100 group-hover/cover:opacity-100 pointer-coarse:opacity-100">
        <span aria-hidden className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground">
          <ImagePlus className="size-4" /> Change cover
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="pointer-events-auto"
          onClick={() => void removeNoteCover(note.id)}
        >
          <Trash2 /> Remove
        </Button>
      </div>
    </div>
  )
}

/** "Add cover" for a note whose cover was removed; sits just above the title and shows on hover or focus. */
export function AddCoverButton({ note }: { note: Note }) {
  if (resolveCover(note)) return null
  return (
    <CoverMenu note={note}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute -top-9 left-[54px] text-muted-foreground opacity-0 transition-none group-focus-within/title:opacity-100 group-hover/title:opacity-100 pointer-coarse:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
      >
        <ImagePlus /> Add cover
      </Button>
    </CoverMenu>
  )
}
