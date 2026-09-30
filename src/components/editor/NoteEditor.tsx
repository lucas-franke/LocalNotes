import type { PartialBlock } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import '@blocknote/shadcn/style.css'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { updateNote } from '@/db/notes'
import { AddCoverButton, CoverBanner } from './CoverBanner'
import type { Note, StoredBlock } from '@/db/schema'

const SAVE_DELAY = 400

/** Stores files inline as data URLs, since there is no server to upload to. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Debounces writes and flushes pending changes when the note is switched,
 * the tab is hidden or the page unloads, so nothing typed is lost.
 */
function useDebouncedSave(noteId: string) {
  const pending = useRef<Partial<Pick<Note, 'title' | 'content'>>>({})
  const timer = useRef<number | undefined>(undefined)

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    if (Object.keys(pending.current).length === 0) return
    const changes = pending.current
    pending.current = {}
    void updateNote(noteId, changes)
  }, [noteId])

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  const save = (changes: Partial<Pick<Note, 'title' | 'content'>>) => {
    Object.assign(pending.current, changes)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, SAVE_DELAY)
  }
  const isPending = useCallback((field: 'title' | 'content') => field in pending.current, [])
  return { save, isPending }
}

/**
 * Mount with `key={note.id}`: the editor is initialised once per note.
 * `embedded` is the compact variant used inside a board card: smaller title, tight padding and no
 * block side menu (the card is small), with the cursor placed at the end of the note.
 */
export function NoteEditor({ note, embedded = false }: { note: Note; embedded?: boolean }) {
  const { resolvedTheme } = useTheme()
  const [title, setTitle] = useState(note.title)
  const [startedUntitled] = useState(!note.title)
  const { save, isPending } = useDebouncedSave(note.id)

  // Pick up renames made elsewhere (e.g. the sidebar), unless a local edit is still unsaved
  useEffect(() => {
    if (!isPending('title')) setTitle(note.title)
  }, [note.title, isPending])

  const editor = useCreateBlockNote({
    initialContent: note.content.length ? (note.content as PartialBlock[]) : undefined,
    uploadFile: fileToDataUrl,
    // Accessible name for the editable area (screen readers otherwise announce just "edit text")
    domAttributes: { editor: { 'aria-label': 'Note content' } },
  })

  // In a card, start typing right away: cursor at the end (an untitled note starts in its title field instead)
  useEffect(() => {
    if (!embedded || startedUntitled) return
    editor.setTextCursorPosition(editor.document[editor.document.length - 1], 'end')
    editor.focus()
  }, [embedded, startedUntitled, editor])

  return (
    <div className={embedded ? 'bn-embedded w-full pt-2 pb-4' : 'mx-auto w-full max-w-3xl px-4 pt-10 pb-32 sm:px-12'}>
      {!embedded && <CoverBanner note={note} />}
      <div className="group/title relative">
        {!embedded && <AddCoverButton note={note} />}
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            save({ title: e.target.value })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
              e.preventDefault()
              editor.setTextCursorPosition(editor.document[0], 'start')
              editor.focus()
            }
          }}
          placeholder="Untitled"
          aria-label="Note title"
          autoFocus={!note.title}
          className={
            embedded
              ? 'mb-1 w-full bg-transparent px-3 text-lg font-semibold tracking-tight outline-none placeholder:text-muted-foreground'
              : 'mb-4 w-full bg-transparent px-[54px] text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground'
          }
        />
      </div>
      <BlockNoteView
        editor={editor}
        sideMenu={!embedded}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={() => save({ content: editor.document as unknown as StoredBlock[] })}
      />
    </div>
  )
}
