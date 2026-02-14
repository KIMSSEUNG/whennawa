import { cn } from "@/lib/utils"
import type { OverallStatus } from "@/lib/types"

interface StatusChipProps {
  status: OverallStatus
  className?: string
}

export function StatusChip({ status, className }: StatusChipProps) {
  const getConfig = () => {
    if (status === "PASSED") {
      return {
        label: "?⑷꺽",
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
      }
    }
    if (status === "REJECTED") {
      return { label: "遺덊빀寃?, className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" }
    }
    return { label: "吏??, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" }
  }

  const config = getConfig()

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}

