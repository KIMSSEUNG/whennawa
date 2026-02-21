"use client"

import { useEffect, useMemo, useState } from "react"
import type { CompanyTimeline } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  timeline: CompanyTimeline | null
}

type Marker = {
  dateKey: string
  label: string
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function TimelineProjectionCalendar({ timeline }: Props) {
  const units = timeline?.regularTimelines ?? []
  const [selectedUnitIndex, setSelectedUnitIndex] = useState("0")
  const [deadlineDate, setDeadlineDate] = useState("")
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [isMonthAnimating, setIsMonthAnimating] = useState(false)

  useEffect(() => {
    setSelectedUnitIndex("0")
  }, [timeline?.companyName, units.length])

  const selectedUnit = useMemo(() => {
    const idx = Number(selectedUnitIndex)
    if (!Number.isFinite(idx) || idx < 0 || idx >= units.length) return null
    return units[idx]
  }, [selectedUnitIndex, units])

  const markers = useMemo(() => {
    if (!selectedUnit || !deadlineDate) return []
    const base = new Date(`${deadlineDate}T00:00:00`)
    if (Number.isNaN(base.getTime())) return []

    const result: Marker[] = [{ dateKey: deadlineDate, label: "지원 서류 마감" }]
    let cumulativeDays = 0

    for (let i = 0; i < selectedUnit.steps.length; i += 1) {
      const step = selectedUnit.steps[i]
      cumulativeDays += step.diffDays ?? 0

      const projected = new Date(base)
      projected.setDate(projected.getDate() + cumulativeDays)
      result.push({
        dateKey: toDateKey(projected),
        label: step.label?.trim() || `단계 ${i + 1}`,
      })
    }

    return result
  }, [selectedUnit, deadlineDate])

  const markerByDate = useMemo(() => {
    const grouped = new Map<string, string[]>()
    for (const marker of markers) {
      const labels = grouped.get(marker.dateKey) ?? []
      if (!labels.includes(marker.label)) labels.push(marker.label)
      grouped.set(marker.dateKey, labels)
    }
    return grouped
  }, [markers])

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  useEffect(() => {
    setIsMonthAnimating(true)
    const timer = setTimeout(() => setIsMonthAnimating(false), 200)
    return () => clearTimeout(timer)
  }, [monthKey])

  if (!units.length) return null

  return (
    <div className="mt-4 rounded-3xl border border-primary/15 bg-gradient-to-b from-card to-background px-4 py-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-medium text-foreground">타임라인 일정 캘린더</p>
        <p className="mt-2 text-xs text-muted-foreground">
          직무와 지원 서류 마감일을 선택하면 타임라인 기준 예상 일정을 달력으로 보여줍니다.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-1">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          모집 구분
          <select
            value={selectedUnitIndex}
            onChange={(e) => setSelectedUnitIndex(e.target.value)}
            className="h-10 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground"
          >
            {units.map((unit, idx) => (
              <option key={`${unit.year}-${idx}`} value={String(idx)}>
                {unit.year}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-border/60 bg-background px-2 py-1">
        <button
          type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="h-8 w-8 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:bg-accent/60"
          aria-label="prev month"
        >
          &lsaquo;
        </button>
        <span className="text-sm font-medium text-foreground">{monthKey}</span>
        <button
          type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="h-8 w-8 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:bg-accent/60"
          aria-label="next month"
        >
          &rsaquo;
        </button>
      </div>

      <div
        className={cn(
          "mt-3 grid grid-cols-7 gap-2 text-center text-xs transition-all duration-200",
          isMonthAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
        )}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="rounded-md bg-muted/40 py-1 text-muted-foreground">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay }, (_, idx) => (
          <div key={`pad-${idx}`} className="h-16 pointer-events-none opacity-0" aria-hidden="true" />
        ))}

        {days.map((day) => {
          const dateKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const labels = markerByDate.get(dateKey) ?? []
          const isDeadline = dateKey === deadlineDate

          return (
            <div
              key={dateKey}
              onClick={() => setDeadlineDate(dateKey)}
              className={cn(
                "h-16 rounded-xl border border-transparent bg-card/60 px-1 py-1 text-foreground shadow-[inset_0_0_0_1px_rgba(59,91,219,0.06)] cursor-pointer transition-all hover:bg-accent/50",
                labels.length > 0 && "border-primary/40 bg-primary/5",
                isDeadline && "border-primary/70 bg-primary/12 ring-2 ring-primary/45 shadow-sm",
              )}
            >
              <div className="flex h-full flex-col items-center gap-1">
                <span className="text-[11px]">{day}</span>
                {labels.slice(0, 2).map((label) => (
                  <span
                    key={label}
                    className="max-w-full truncate rounded-md border border-primary/30 bg-primary/5 px-1.5 text-[10px] text-primary/95"
                  >
                    {label}
                  </span>
                ))}
                {labels.length > 2 && <span className="text-[10px] text-muted-foreground">+{labels.length - 2}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {!deadlineDate && (
        <p className="mt-3 text-xs text-muted-foreground">달력에서 지원 서류 마감일을 직접 선택해 주세요.</p>
      )}
    </div>
  )
}

