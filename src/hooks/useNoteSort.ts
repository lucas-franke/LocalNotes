import { useState } from 'react'
import type { NoteSortKey, SortDirection } from '@/db/notes'

export interface NoteSort {
  key: NoteSortKey
  direction: SortDirection
}

const SORT_KEY = 'localnotes:folderSort'
const SORT_KEYS: NoteSortKey[] = ['edited', 'created', 'title', 'length']
const DEFAULT_SORT: NoteSort = { key: 'edited', direction: 'desc' }

/** Sort choice for folder views; remembered in this browser across folders and reloads. */
export function useNoteSort() {
  const [sort, setSort] = useState<NoteSort>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SORT_KEY) ?? 'null') as NoteSort | null
      const valid = saved && SORT_KEYS.includes(saved.key) && ['asc', 'desc'].includes(saved.direction)
      return valid ? saved : DEFAULT_SORT
    } catch {
      return DEFAULT_SORT
    }
  })
  const update = (next: NoteSort) => {
    setSort(next)
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(next))
    } catch {
      // per-browser convenience only
    }
  }
  return [sort, update] as const
}
