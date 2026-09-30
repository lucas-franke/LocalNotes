import { Image as ImageIcon, PanelTop, Text } from 'lucide-react'
import type { NoteCardView } from '@/db/schema'

export const CARD_VIEW_INFO: Record<NoteCardView, { label: string; hint: string; icon: typeof Text }> = {
  full: { label: 'Full', hint: 'Cover, title, text and details', icon: PanelTop },
  cover: { label: 'Cover', hint: 'Cover and title', icon: ImageIcon },
  title: { label: 'Title', hint: 'Title only', icon: Text },
}
