import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { describeProject, importProject, type ImportMode, type ProjectFile } from '@/lib/project-file'
import { openNote } from '@/hooks/useRoute'

export function ImportDialog({ project, onClose }: { project: ProjectFile | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false)

  const run = async (mode: ImportMode) => {
    if (!project) return
    setBusy(true)
    try {
      await importProject(project, mode)
      if (mode === 'replace') openNote(null)
      toast.success(`Imported ${describeProject(project)}.`)
      onClose()
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={project !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import project</DialogTitle>
          <DialogDescription>
            {project &&
              `${describeProject(project)}, exported ${new Date(project.exportedAt).toLocaleString()}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Merge</span> adds the contents to your current ones. If a note
            or board exists in both, the more recently edited version is kept.
          </p>
          <p>
            <span className="font-medium text-foreground">Replace</span> deletes all current notes, folders and boards first.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => run('replace')}>
            Replace all
          </Button>
          <Button disabled={busy} onClick={() => run('merge')}>
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
