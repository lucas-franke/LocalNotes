import { useLiveQuery } from 'dexie-react-hooks'
import {
  FileText,
  Folder as FolderIcon,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pin,
  Plus,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RowContextMenu, RowDropdownMenu, type MenuEntry } from '@/components/ItemMenu'
import { RenameInput } from '@/components/sidebar/RenameInput'
import { Button } from '@/components/ui/button'
import { db } from '@/db/db'
import { createFolder, renameFolder } from '@/db/folders'
import { createNote, notePreview, noteTitle, noteWordCount, renameNote, sortNotesBy } from '@/db/notes'
import type { Folder, Note } from '@/db/schema'
import { useFolderMenuEntries, useNoteMenuEntries } from '@/hooks/useItemMenus'
import { useNoteSort } from '@/hooks/useNoteSort'
import { openFolder, openNote } from '@/hooks/useRoute'
import { sortFolders } from '@/lib/folder-tree'
import { formatDate, formatDateTime, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SortMenu } from './SortMenu'

const plural = (n: number, word: string) => `${n.toLocaleString('en')} ${word}${n === 1 ? '' : 's'}`

/** A folder opened as a page: its subfolders and notes as preview cards. */
export function FolderView({ folder }: { folder: Folder }) {
  const folders = useLiveQuery(() => db.folders.toArray(), [], [] as Folder[])
  const notes = useLiveQuery(() => db.notes.toArray(), [], [] as Note[])

  const subfolders = sortFolders(folders.filter((f) => f.parentId === folder.id))
  const [sort, setSort] = useNoteSort()
  const folderNotes = sortNotesBy(
    notes.filter((n) => n.folderId === folder.id),
    sort.key,
    sort.direction,
  )
  const counts = (id: string) => ({
    notes: notes.filter((n) => n.folderId === id).length,
    folders: folders.filter((f) => f.parentId === id).length,
  })
  const empty = subfolders.length === 0 && folderNotes.length === 0

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-10 pb-32 sm:px-12">
      <div className="flex items-center gap-3">
        <FolderOpen className="size-8 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <FolderTitle folder={folder} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {plural(folderNotes.length, 'note')}
        {subfolders.length > 0 && ` · ${plural(subfolders.length, 'folder')}`}
        {' · '}
        <span title={formatDateTime(folder.createdAt)}>Created {formatDate(folder.createdAt)}</span>
      </p>

      <div className="mt-6 flex gap-2">
        <Button onClick={async () => openNote(await createNote(folder.id))}>
          <Plus /> New note
        </Button>
        <Button
          variant="outline"
          onClick={async () => openFolder(await createFolder('New folder', folder.id))}
        >
          <FolderPlus /> New folder
        </Button>
      </div>

      {empty && <p className="mt-10 text-sm text-muted-foreground">This folder is empty.</p>}

      {subfolders.length > 0 && (
        <CardSection title="Folders">
          {subfolders.map((sub) => (
            <FolderCard key={sub.id} folder={sub} {...counts(sub.id)} />
          ))}
        </CardSection>
      )}

      {folderNotes.length > 0 && (
        <CardSection title="Notes" action={<SortMenu sort={sort} onChange={setSort} />}>
          {folderNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </CardSection>
      )}
    </div>
  )
}

function NoteCard({ note }: { note: Note }) {
  const [renaming, setRenaming] = useState(false)
  const entries = useNoteMenuEntries(note, { onRename: () => setRenaming(true) })
  const preview = notePreview(note)

  return (
    <CardShell
      href={`#/note/${encodeURIComponent(note.id)}`}
      icon={FileText}
      title={noteTitle(note)}
      entries={entries}
      rename={
        renaming && {
          initial: note.title,
          onDone: (title) => {
            if (title !== null) void renameNote(note.id, title)
            setRenaming(false)
          },
        }
      }
      badges={
        <>
          {note.favorite && <Star className="size-3.5 shrink-0 text-muted-foreground" aria-label="Favorite" />}
          {note.pinned && <Pin className="size-3.5 shrink-0 text-muted-foreground" aria-label="Pinned" />}
        </>
      }
      className="h-44"
    >
      <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
        {preview || <span className="italic">Empty note</span>}
      </p>
      <CardMeta
        primary={
          <>
            <span title={formatDateTime(note.updatedAt)}>Edited {formatRelative(note.updatedAt)}</span>
            {' · '}
            {plural(noteWordCount(note), 'word')}
          </>
        }
        created={note.createdAt}
      />
    </CardShell>
  )
}

function FolderCard({ folder, notes, folders }: { folder: Folder; notes: number; folders: number }) {
  const [renaming, setRenaming] = useState(false)
  const entries = useFolderMenuEntries(folder, { onRename: () => setRenaming(true) })

  return (
    <CardShell
      href={`#/folder/${encodeURIComponent(folder.id)}`}
      icon={FolderIcon}
      title={folder.name}
      entries={entries}
      rename={
        renaming && {
          initial: folder.name,
          onDone: (name) => {
            if (name !== null) void renameFolder(folder.id, name)
            setRenaming(false)
          },
        }
      }
    >
      <CardMeta
        primary={
          <>
            {plural(notes, 'note')}
            {folders > 0 && ` · ${plural(folders, 'folder')}`}
          </>
        }
        created={folder.createdAt}
      />
    </CardShell>
  )
}

/** Two fixed lines so every card's footer lines up. */
function CardMeta({ primary, created }: { primary: ReactNode; created: number }) {
  return (
    <div className="mt-auto space-y-0.5 text-xs text-muted-foreground">
      <p className="truncate">{primary}</p>
      <p title={formatDateTime(created)}>Created {formatDate(created)}</p>
    </div>
  )
}

/**
 * A card whose title link stretches over the whole card (`after:inset-0`), so the card is one
 * big click target while the "…" button can sit on top of it without nesting interactive elements.
 */
function CardShell({
  href,
  icon: Icon,
  title,
  entries,
  rename,
  badges,
  className,
  children,
}: {
  href: string
  icon: LucideIcon
  title: string
  entries: MenuEntry[]
  rename: false | { initial: string; onDone: (value: string | null) => void }
  badges?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <RowContextMenu entries={entries}>
      <div
        className={cn(
          'group/card relative flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-ring/60 hover:bg-accent/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/60',
          className,
        )}
      >
        <div className="flex h-7 items-center gap-2 pr-8">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {rename ? (
            <RenameInput initial={rename.initial} onDone={rename.onDone} />
          ) : (
            <a
              href={href}
              className="min-w-0 flex-1 truncate font-medium outline-none after:absolute after:inset-0 after:rounded-lg"
            >
              {title}
            </a>
          )}
          {badges}
        </div>
        {children}
        <div className="absolute top-3 right-3 z-10 hidden group-focus-within/card:flex group-hover/card:flex pointer-coarse:flex has-data-[state=open]:flex">
          <RowDropdownMenu
            align="end"
            entries={entries}
            trigger={
              <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${title}`}>
                <MoreHorizontal />
              </Button>
            }
          />
        </div>
      </div>
    </RowContextMenu>
  )
}

function CardSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex h-9 items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">{children}</div>
    </section>
  )
}

/** Editable folder name, styled like a note title. */
function FolderTitle({ folder }: { folder: Folder }) {
  const [name, setName] = useState(folder.name)
  const ref = useRef<HTMLInputElement>(null)

  // Follow renames made elsewhere (e.g. the sidebar) while not editing here
  useEffect(() => {
    if (document.activeElement !== ref.current) setName(folder.name)
  }, [folder.name])

  const commit = () => {
    if (name.trim() !== folder.name) void renameFolder(folder.id, name)
    if (!name.trim()) setName('Untitled folder')
  }

  return (
    <input
      ref={ref}
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setName(folder.name)
          requestAnimationFrame(() => ref.current?.blur())
        }
      }}
      placeholder="Untitled folder"
      aria-label="Folder name"
      className="w-full min-w-0 bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-muted-foreground"
    />
  )
}
