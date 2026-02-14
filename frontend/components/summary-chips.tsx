import { cn } from "@/lib/utils"

interface SummaryChipsProps {
  total: number
  applied: number
  passed: number
  rejected: number
  isLoading?: boolean
}

export function SummaryChips({ total, applied, passed, rejected, isLoading }: SummaryChipsProps) {
  const chips = [
    { label: "?꾩껜", value: total, className: "bg-muted text-foreground" },
    {
      label: "吏??,
      value: applied,
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    },
    {
      label: "?⑷꺽",
      value: passed,
      className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    },
    { label: "遺덊빀寃?, value: rejected, className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            chip.className,
          )}
        >
          <span>{chip.label}</span>
          <span className="font-semibold">{isLoading ? "?? : chip.value}</span>
        </span>
      ))}
    </div>
  )
}

