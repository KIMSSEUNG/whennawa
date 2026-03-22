'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from 'next-themes'

function applyThemeToDocument(theme: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
  window.localStorage.setItem('theme', theme)
}

function ThemePreferenceSync() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    if (theme !== 'light' && theme !== 'dark') {
      setTheme('light')
      applyThemeToDocument('light')
    }
  }, [theme, setTheme])

  React.useEffect(() => {
    const activeTheme = theme === 'dark' || resolvedTheme === 'dark' ? 'dark' : 'light'
    const themeColor = activeTheme === 'dark' ? '#0b1220' : '#f8faff'
    const metas = document.querySelectorAll('meta[name="theme-color"]')

    if (metas.length === 0) {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = themeColor
      document.head.appendChild(meta)
      return
    }

    metas.forEach((meta) => {
      meta.setAttribute('content', themeColor)
      meta.removeAttribute('media')
    })

    applyThemeToDocument(activeTheme)
  }, [theme, resolvedTheme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemePreferenceSync />
      {children}
    </NextThemesProvider>
  )
}
