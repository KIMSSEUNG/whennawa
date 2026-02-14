import type React from "react"
import { cn } from "@/lib/utils"

interface StatusSectionProps {
  title: string
  count: number
  children: React.ReactNode
  className?: string
}

export function StatusSection({ title, count, children, className }: StatusSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{children}</div>
    </section>
  )
}
