import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Tip } from '@/components/Tip'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <Tip label={label}>
      <Button variant="ghost" size="icon-sm" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={label}>
        {dark ? <Sun /> : <Moon />}
      </Button>
    </Tip>
  )
}
