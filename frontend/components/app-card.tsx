import type React from "react"
import { cn } from "@/lib/utils"

interface AppCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  gradient?: "purple" | "pink" | "blue" | "green" | "none"
}

export function AppCard({ children, className, hover = false, gradient = "none" }: AppCardProps) {
  const gradientClasses = {
    purple: "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30",
    pink: "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30",
    blue: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
    green: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
    none: "bg-card",
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 p-5 shadow-sm transition-all duration-200",
        gradientClasses[gradient],
        hover && "hover:shadow-md hover:border-primary/40 hover:bg-accent/30 active:scale-[0.98]",
        className,
      )}
    >
      {children}
    </div>
  )
}
