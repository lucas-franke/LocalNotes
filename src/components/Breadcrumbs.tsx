import { useLiveQuery } from 'dexie-react-hooks'
import { Folder as FolderIcon } from 'lucide-react'
import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { db } from '@/db/db'
import type { Folder } from '@/db/schema'
import { openFolder } from '@/hooks/useRoute'
import { folderPath } from '@/lib/folder-tree'

/** Show at most this many folders; deeper paths collapse the middle into "…". */
const MAX_FOLDERS = 3

/** Trail of folders leading to the current page (a note or a folder), which is shown last. */
export function Breadcrumbs({ folderId, current }: { folderId: string | null; current: string }) {
  const folders = useLiveQuery(() => db.folders.toArray(), [], [] as Folder[])
  const path = folderPath(folders, folderId)
  const collapsed = path.length > MAX_FOLDERS
  const hidden = collapsed ? path.slice(1, -(MAX_FOLDERS - 1)) : []
  const visible = collapsed ? [path[0], null, ...path.slice(-(MAX_FOLDERS - 1))] : path

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {visible.map((folder, i) => (
          <Fragment key={folder?.id ?? 'ellipsis'}>
            <BreadcrumbItem className="min-w-0">
              {folder ? (
                <button
                  onClick={() => openFolder(folder.id)}
                  className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-foreground"
                >
                  {i === 0 && <FolderIcon className="size-3.5 shrink-0" />}
                  <span className="max-w-40 truncate">{folder.name}</span>
                </button>
              ) : (
                <BreadcrumbEllipsis
                  className="size-6"
                  title={hidden.map((f) => f.name).join(' › ')}
                />
              )}
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate px-1.5">{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
