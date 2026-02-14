"use client"

import { cn } from "@/lib/utils"
import type { OverallStatus } from "@/lib/types"

export type FilterValue = "ALL" | OverallStatus

interface FilterChipsProps {
  value: FilterValue
  onChange: (value: FilterValue) => void
  counts: {
    all: number
    applied: number
    passed: number
    rejected: number
  }
}

const filters: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "APPLIED", label: "지원" },
  { value: "PASSED", label: "합격" },
  { value: "REJECTED", label: "불합격" },
]

export function FilterChips({ value, onChange, counts }: FilterChipsProps) {
  const getCount = (filterValue: FilterValue) => {
    switch (filterValue) {
      case "ALL":
        return counts.all
      case "APPLIED":
        return counts.applied
      case "PASSED":
        return counts.passed
      case "REJECTED":
        return counts.rejected
      default:
        return 0
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onChange(filter.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            value === filter.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent/60",
          )}
        >
          <span>{filter.label}</span>
          <span className="text-xs opacity-70">{getCount(filter.value)}</span>
        </button>
      ))}
    </div>
  )
}
