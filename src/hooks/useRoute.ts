import { useSyncExternalStore } from 'react'

/** The current view lives in the URL hash (#/note/<id> or #/folder/<id>) so reloads stay put. */
export type Route = { type: 'note' | 'folder'; id: string } | null

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

// useSyncExternalStore needs a stable snapshot, so cache by hash string
let cachedHash: string | null = null
let cachedRoute: Route = null

function getRoute(): Route {
  const hash = window.location.hash
  if (hash !== cachedHash) {
    cachedHash = hash
    const match = /^#\/(note|folder)\/(.+)$/.exec(hash)
    cachedRoute = match ? { type: match[1] as 'note' | 'folder', id: decodeURIComponent(match[2]) } : null
  }
  return cachedRoute
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute)
}

export function useActiveNoteId(): string | null {
  const route = useRoute()
  return route?.type === 'note' ? route.id : null
}

export function useActiveFolderId(): string | null {
  const route = useRoute()
  return route?.type === 'folder' ? route.id : null
}

export function openNote(id: string | null) {
  window.location.hash = id ? `#/note/${encodeURIComponent(id)}` : ''
}

export function openFolder(id: string) {
  window.location.hash = `#/folder/${encodeURIComponent(id)}`
}
