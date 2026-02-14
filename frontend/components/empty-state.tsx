import type React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description: string
  className?: string
  children?: React.ReactNode
}

export function EmptyState({ title, description, className, children }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="mb-4 rounded-2xl bg-muted px-6 py-4">
        <span className="text-2xl font-bold text-muted-foreground">?</span>
      </div>
      <h3 className="mb-2 text-lg font-medium text-foreground">{title}</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}
