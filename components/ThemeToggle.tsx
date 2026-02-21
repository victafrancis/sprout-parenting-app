'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        Theme
      </Button>
    )
  }

  const isDarkModeEnabled = theme === 'dark'

  function handleToggleTheme() {
    if (isDarkModeEnabled) {
      setTheme('light')
      return
    }

    setTheme('dark')
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggleTheme}
      aria-label={isDarkModeEnabled ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkModeEnabled ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="ml-2">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="ml-2">Dark</span>
        </>
      )}
    </Button>
  )
}