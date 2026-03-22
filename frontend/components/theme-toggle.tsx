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
    return <button className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-muted-foreground">테마</button>
  }

  return (
    <div className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#f4f7ff] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] dark:bg-[#18233c]">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "rounded-full px-3 py-1 text-sm transition-colors",
          resolvedTheme === "light"
            ? "bg-white font-medium text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        라이트
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "rounded-full px-3 py-1 text-sm transition-colors",
          resolvedTheme === "dark"
            ? "bg-background font-medium text-foreground shadow-sm dark:bg-[#243454] dark:text-[#eff4ff]"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        다크
      </button>
    </div>
  )
}
