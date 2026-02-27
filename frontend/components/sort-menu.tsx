"use client"

import { cn } from "@/lib/utils"

export type SortValue = "lastUpdated" | "companyName"

interface SortMenuProps {
  value: SortValue
  onChange: (value: SortValue) => void
}

const sortOptions: { value: SortValue; label: string }[] = [
  { value: "lastUpdated", label: "최근 업데이트" },
  { value: "companyName", label: "회사명" },
]

export function SortMenu({ value, onChange }: SortMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">정렬:</span>
      <div className="flex gap-1">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-sm transition-colors",
              value === option.value
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
