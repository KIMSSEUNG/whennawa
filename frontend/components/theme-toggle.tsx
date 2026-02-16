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
    return <button className="min-w-[112px] rounded-lg px-3 py-1.5 text-sm text-muted-foreground">테마</button>
  }

  return (
    <div className="flex min-w-[130px] items-center gap-1 rounded-lg bg-muted p-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "min-w-[52px] rounded-md px-3 py-1 text-sm transition-colors",
          resolvedTheme === "light"
            ? "bg-background font-medium text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        라이트
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "min-w-[52px] rounded-md px-3 py-1 text-sm transition-colors",
          resolvedTheme === "dark"
            ? "bg-background font-medium text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        다크
      </button>
    </div>
  )
}
