const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const date = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })

/** "just now", "5 minutes ago", "yesterday", "3 days ago"; older than a week → a date. */
export function formatRelative(time: number, now = Date.now()) {
  const diff = time - now
  const abs = Math.abs(diff)
  if (abs < MINUTE) return 'just now'
  if (abs < HOUR) return relative.format(Math.round(diff / MINUTE), 'minute')
  if (abs < DAY) return relative.format(Math.round(diff / HOUR), 'hour')
  if (abs < 7 * DAY) return relative.format(Math.round(diff / DAY), 'day')
  return formatDate(time)
}

/** "30 Sep 2026" */
export function formatDate(time: number) {
  return date.format(time)
}

/** Full date and time, for tooltips. */
export function formatDateTime(time: number) {
  return new Date(time).toLocaleString()
}

/** "1 note", "3 notes" */
export const plural = (n: number, word: string) => `${n.toLocaleString('en')} ${word}${n === 1 ? '' : 's'}`
