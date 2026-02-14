"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <button className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground">테마</button>
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "rounded-md px-3 py-1 text-sm transition-colors",
          resolvedTheme === "light"
            ? "bg-background text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        라이트
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "rounded-md px-3 py-1 text-sm transition-colors",
          resolvedTheme === "dark"
            ? "bg-background text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        다크
      </button>
    </div>
  )
}
