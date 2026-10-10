import { useCallback, useState } from 'react'

/** The default (and smallest) width: w-64. */
export const SIDEBAR_MIN = 256
const SIDEBAR_MAX = 560
/** The page next to the sidebar always keeps at least this much room. */
const PAGE_MIN = 360
const KEY = 'localnotes:sidebarWidth'

export const sidebarMaxWidth = () => Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, window.innerWidth - PAGE_MIN))
export const clampSidebarWidth = (width: number) =>
  Math.round(Math.min(sidebarMaxWidth(), Math.max(SIDEBAR_MIN, width)))

function loadWidth() {
  try {
    const saved = Number(localStorage.getItem(KEY))
    return saved ? clampSidebarWidth(saved) : SIDEBAR_MIN
  } catch {
    return SIDEBAR_MIN
  }
}

/** The sidebar's width in px: starts at the minimum, can be widened, and is remembered in this browser. */
export function useSidebarWidth() {
  const [width, setWidth] = useState(loadWidth)
  const save = useCallback((next: number) => {
    try {
      localStorage.setItem(KEY, String(clampSidebarWidth(next)))
    } catch {
      // per-browser convenience only
    }
  }, [])
  return { width, setWidth: (w: number) => setWidth(clampSidebarWidth(w)), save }
}
