"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import type { CompanySearchItem, CompanyTimeline, CompanyTimelineStep, KeywordLeadTime } from "@/lib/types"
import { cn } from "@/lib/utils"
import { normalizeUnitCategory } from "@/lib/unit-category"
import { Input } from "@/components/ui/input"
import { TimelineProjectionCalendar } from "@/components/timeline-projection-calendar"

interface CompanyDetailPanelProps {
  company: CompanySearchItem | null
  timeline: CompanyTimeline | null
  leadTime: KeywordLeadTime | null
  keyword: string
  lastLeadTimeKeyword: string
  onKeywordChange: (value: string) => void
  onKeywordSearch: (event: React.FormEvent, keywordOverride?: string) => void
  selectedCalendarDate: string | null
  onCalendarDateSelect: (dateStr: string) => void
  isCalendarVisible: boolean
  isTimelineLoading: boolean
  isLeadTimeLoading: boolean
  onQuickReport: (companyName: string) => void
  className?: string
}

const formatDate = (value: Date | null) =>
  value
    ? value.toLocaleDateString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
      })
    : "-"

function getLeadTimeMessages(keyword: string, leadTime: KeywordLeadTime) {
  const target = keyword.trim() || "해당 전형"
  const messages: string[] = []

  if (leadTime.medianDays != null) {
    messages.push(`${target} 결과는 보통 ${leadTime.medianDays}일 후 발표됐어요.`)
  }

  if (leadTime.minDays != null && leadTime.maxDays != null) {
    if (leadTime.minDays !== leadTime.maxDays) {
      messages.push(`가장 빨랐던 사례는 ${leadTime.minDays}일, 가장 늦었던 사례는 ${leadTime.maxDays}일이었어요.`)
    }
  } else if (leadTime.minDays != null) {
    messages.push(`가장 빨랐던 사례는 ${leadTime.minDays}일이었어요.`)
  } else if (leadTime.maxDays != null) {
    messages.push(`가장 늦었던 사례는 ${leadTime.maxDays}일이었어요.`)
  }

  return messages
}

function TimelineRail({ steps }: { steps: CompanyTimelineStep[] }) {
  if (!steps.length) return null

  return (
    <div className="rounded-2xl border border-border/60 bg-background px-3 py-4">
      <div className="relative">
        <div className="pointer-events-none absolute left-6 right-6 top-2 h-px bg-border" />

        <div className="flex items-start gap-2">
        {steps.map((step, index) => {
          const showLabel = Boolean(step.label && step.label.trim())
          const finalLabel = showLabel ? (step.label as string) : "전형 진행"

          return (
            <div key={`${step.label}-${index}`} className="min-w-0 flex-1">
              <div className="relative px-1 pt-5 text-center">
                <span className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-primary/70 bg-card shadow-sm" />

                <span className="inline-block rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                  {index + 1}단계
                </span>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{finalLabel}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.occurredAt ? formatDate(step.occurredAt) : "-"}</p>
                {step.diffDays != null && (
                  <span className="mt-1 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    +{step.diffDays}일
                  </span>
                )}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}

function LeadTimeCalendar({
  keyword,
  leadTime,
  selectedDate,
  onDateSelect,
}: {
  keyword: string
  leadTime: KeywordLeadTime | null
  selectedDate: string | null
  onDateSelect: (dateStr: string) => void
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const expectedDays = useMemo(() => {
    if (!leadTime) return null
    if (leadTime.medianDays != null) return leadTime.medianDays
    if (leadTime.minDays != null && leadTime.maxDays != null) {
      return Math.round((leadTime.minDays + leadTime.maxDays) / 2)
    }
    return null
  }, [leadTime])

  const derivedDates = useMemo(() => {
    if (!selectedDate || expectedDays == null) return null
    const base = new Date(`${selectedDate}T00:00:00`)
    if (Number.isNaN(base.getTime())) return null

    const expectedDate = new Date(base)
    expectedDate.setDate(expectedDate.getDate() + expectedDays)

    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    return {
      expectedKey: toKey(expectedDate),
      selectedDisplay: base.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }),
      expectedDisplay: expectedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }),
    }
  }, [expectedDays, selectedDate])

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const [isMonthAnimating, setIsMonthAnimating] = useState(false)

  useEffect(() => {
    setIsMonthAnimating(true)
    const handle = setTimeout(() => setIsMonthAnimating(false), 220)
    return () => clearTimeout(handle)
  }, [monthKey])

  const handlePrev = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  const handleNext = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
  const moveToExpectedMonth = (dateStr: string) => {
    if (expectedDays == null) return
    const base = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(base.getTime())) return
    const expectedDate = new Date(base)
    expectedDate.setDate(expectedDate.getDate() + expectedDays)
    setMonth(new Date(expectedDate.getFullYear(), expectedDate.getMonth(), 1))
  }

  return (
    <div className="mt-4 rounded-3xl border border-primary/15 bg-gradient-to-b from-card to-background px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">예상 결과 발표 캘린더</p>
          <p className="text-xs text-muted-foreground mt-2">
            선택한 날짜(이전 전형 발표일)를 기준으로 예상 결과 발표 범위를 보여줍니다.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-2 py-1">
          <button
            type="button"
            onClick={handlePrev}
            className="h-8 w-8 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:bg-accent/60"
            aria-label="prev month"
          >
            &lsaquo;
          </button>
          <span className="text-sm font-medium text-foreground">{monthKey}</span>
          <button
            type="button"
            onClick={handleNext}
            className="h-8 w-8 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:bg-accent/60"
            aria-label="next month"
          >
            &rsaquo;
          </button>
        </div>
      </div>

      {!keyword.trim() || expectedDays == null ? (
        <p className="text-xs text-muted-foreground">
          전형 키워드를 검색한 뒤 날짜를 선택해 주세요.
        </p>
      ) : (
        <div
          className={cn(
            "grid grid-cols-7 gap-2 text-center text-xs transition-all duration-200",
            isMonthAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
          )}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="rounded-md bg-muted/40 py-1 text-muted-foreground">
              {day}
            </div>
          ))}

          {Array.from({ length: firstDay }, (_, idx) => (
            <div key={`pad-${idx}`} className="h-14 pointer-events-none opacity-0" aria-hidden="true" />
          ))}

          {days.map((day) => {
            const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const isSelected = selectedDate === dateStr
            const isExpectedDate = derivedDates?.expectedKey === dateStr

            return (
              <button
                key={dateStr}
                type="button"
                disabled={!keyword.trim() || expectedDays == null}
                onClick={() => {
                  moveToExpectedMonth(dateStr)
                  onDateSelect(dateStr)
                }}
                className={cn(
                  "h-14 rounded-xl border border-transparent bg-card/60 px-1 py-1 text-xs shadow-[inset_0_0_0_1px_rgba(59,91,219,0.06)] transition-colors",
                  "text-foreground hover:bg-accent/60",
                  isExpectedDate ? "border-border/60" : "",
                  isSelected ? "border-primary/30 bg-primary/10 ring-2 ring-primary/70" : "",
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px]">{day}</span>
                  {isExpectedDate && <span className="rounded bg-primary/15 px-1 text-[10px] text-primary">예상</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {derivedDates && (
        <div className="mt-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
          선택 날짜: {derivedDates.selectedDisplay} · 예상 발표일: {derivedDates.expectedDisplay}
        </div>
      )}
    </div>
  )
}

export function CompanyDetailPanel({
  company,
  timeline,
  leadTime,
  keyword,
  lastLeadTimeKeyword,
  onKeywordChange,
  onKeywordSearch,
  selectedCalendarDate,
  onCalendarDateSelect,
  isCalendarVisible,
  isTimelineLoading,
  isLeadTimeLoading,
  onQuickReport,
  className,
}: CompanyDetailPanelProps) {
  const normalizedKeyword = keyword.trim().toLowerCase()

  const timelineSuggestions = Array.from(
    new Set(
      (timeline?.timelines ?? [])
        .flatMap((unit) => unit.steps)
        .filter((step) => step.prevStepId != null)
        .map((step) => step.label)
        .filter((label): label is string => Boolean(label && label.trim())),
    ),
  )

  const filteredSuggestions = timelineSuggestions.filter((label) => {
    if (!normalizedKeyword) return true
    return label.toLowerCase().includes(normalizedKeyword) && label.toLowerCase() !== normalizedKeyword
  })

  const limitedSuggestions = filteredSuggestions.slice(0, 5)
  const extractKeyword = (label: string) => {
    const parts = label.split(" - ")
    return (parts[parts.length - 1] ?? label).trim()
  }

  if (!company) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="text-center">
          <div className="mb-4 rounded-2xl bg-muted px-6 py-4 inline-block">
            <span className="text-2xl font-bold text-muted-foreground">선택</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{company.companyName}</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">대표 타임라인</h3>
          <p className="mb-3 text-xs text-muted-foreground">회사별 전형 흐름과 평균 진행 속도를 확인하세요.</p>
          {isTimelineLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : !timeline || timeline.timelines.length === 0 ? (
            <p className="text-sm text-muted-foreground">타임라인이 없습니다.</p>
          ) : (
            <div className="space-y-6">
              {timeline.timelines.map((unitTimeline, index) => (
                <div key={`${unitTimeline.unitName}-${unitTimeline.channelType}-${unitTimeline.year}-${index}`}>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{normalizeUnitCategory(unitTimeline.unitName) ?? unitTimeline.unitName}</span>
                  </div>
                  <TimelineRail steps={unitTimeline.steps} />
                </div>
              ))}
            </div>
          )}
          <TimelineProjectionCalendar timeline={timeline} />
        </section>

        <div className="flex">
          <button
            type="button"
            onClick={() => onQuickReport(company.companyName)}
            className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15"
          >
            오늘 결과발표 넣었어요
          </button>
        </div>

        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">전형 기간 검색</h3>
          <p className="mb-3 text-xs text-muted-foreground">전형 키워드로 합격 발표까지 걸린 기간을 확인하세요.</p>

          <form onSubmit={onKeywordSearch} className="flex gap-2">
            <Input
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="전형 키워드를 입력 (예: 서류, 1차면접)"
              className="h-10 rounded-xl border-border bg-card"
            />
            <button
              type="submit"
              disabled={isLeadTimeLoading}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLeadTimeLoading ? "검색 중..." : "검색"}
            </button>
          </form>

          {limitedSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">추천 키워드</p>
              <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
                {limitedSuggestions.map((label, idx) => (
                  <button
                    key={`leadtime-suggest-${label}`}
                    type="button"
                    onClick={() => {
                      const extracted = extractKeyword(label)
                      onKeywordChange(extracted)
                      onKeywordSearch({ preventDefault() {} } as React.FormEvent, extracted)
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 text-sm text-foreground hover:bg-accent/60 transition-colors",
                      idx !== limitedSuggestions.length - 1 && "border-b border-border/60",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 rounded-xl border border-border/60 bg-background px-4 py-3">
            {leadTime ? (
              leadTime.medianDays != null || leadTime.minDays != null || leadTime.maxDays != null ? (
                <div className="space-y-1 text-sm text-foreground">
                  {getLeadTimeMessages(keyword, leadTime).map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">해당 키워드 결과가 없습니다.</p>
              )
            ) : lastLeadTimeKeyword ? (
              <p className="text-sm text-muted-foreground">해당 검색 결과가 없습니다.</p>
            ) : (
              <p className="text-sm text-muted-foreground">키워드를 검색해 결과를 확인하세요.</p>
            )}
          </div>

          {isCalendarVisible && (
            <LeadTimeCalendar
              keyword={keyword}
              leadTime={leadTime}
              selectedDate={selectedCalendarDate}
              onDateSelect={onCalendarDateSelect}
            />
          )}
        </section>
      </div>
    </div>
  )
}
