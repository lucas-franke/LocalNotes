import { ArchiveRestore, Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImportDialog } from '@/components/ImportDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportProject, getLastExport, readProjectFile, type ProjectFile } from '@/lib/project-file'
import { formatRelative } from '@/lib/format'

const EXPORT_REMINDER_DAYS = 7
const DAY = 24 * 60 * 60 * 1000

/**
 * One calm footer control for export/import. An overdue backup shows a small amber dot
 * instead of loud warning text; the explanation lives inside the menu.
 */
export function BackupMenu({ hasNotes }: { hasNotes: boolean }) {
  const [lastExport, setLastExport] = useState(getLastExport)
  const [importing, setImporting] = useState<ProjectFile | null>(null)
  // "Now" for the status text; refreshed when the menu opens and after an export
  const [now, setNow] = useState(Date.now)
  const fileInput = useRef<HTMLInputElement>(null)

  const status = lastExport ? `Last backup ${formatRelative(lastExport, now)}` : 'Never backed up'
  const overdue = hasNotes && (!lastExport || now - lastExport > EXPORT_REMINDER_DAYS * DAY)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setImporting(await readProjectFile(file))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read the file.')
    }
  }

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && setNow(Date.now())}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Backup. ${status}${overdue ? ', backup recommended' : ''}`}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-sidebar-accent"
          >
            <ArchiveRestore className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                Backup
                {overdue && <span className="size-2 rounded-full bg-amber-500" aria-hidden />}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{status}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-60">
          <DropdownMenuItem
           
            onSelect={async () => {
              await exportProject()
              const time = Date.now()
              setLastExport(time)
              setNow(time)
            }}
          >
            <Download /> Export all notes (.json)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <Upload /> Import from file…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
            Notes, boards and images are stored only in this browser. Export regularly to keep a copy.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          void onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <ImportDialog project={importing} onClose={() => setImporting(null)} />
    </>
  )
}
