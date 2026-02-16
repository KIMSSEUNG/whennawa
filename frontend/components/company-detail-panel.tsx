"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CompanySearchItem, CompanyTimeline, CompanyTimelineStep, KeywordLeadTime, RollingPrediction } from "@/lib/types"
import { fetchRollingPrediction } from "@/lib/api"
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
  onQuickReport: (companyName: string, mode: "REGULAR" | "ROLLING") => void
  className?: string
}

const formatDate = (value: Date | null) =>
  value
    ? value.toLocaleDateString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
      })
    : "-"

const formatDateYmd = (value: Date | null) => {
  if (!value) return "-"
  return value.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function getLeadTimeMessages(keyword: string, leadTime: KeywordLeadTime) {
  const target = keyword.trim() || "해당 전형"
  const messages: string[] = []

  if (leadTime.medianDays != null) {
    messages.push(`${target} 결과는 이전 합격일 기준 보통 ${leadTime.medianDays}일 후 발표됐어요.`)
  }

  if (leadTime.minDays != null && leadTime.maxDays != null) {
    if (leadTime.minDays !== leadTime.maxDays) {
      messages.push(`가장 빨랐던 사례는 이전 합격일 기준 ${leadTime.minDays}일, 가장 늦었던 사례는 ${leadTime.maxDays}일이었어요.`)
    }
  } else if (leadTime.minDays != null) {
    messages.push(`가장 빨랐던 사례는 이전 합격일 기준 ${leadTime.minDays}일이었어요.`)
  } else if (leadTime.maxDays != null) {
    messages.push(`가장 늦었던 사례는 이전 합격일 기준 ${leadTime.maxDays}일이었어요.`)
  }

  return messages
}

function renderLeadTimeMessage(message: string) {
  const match = message.match(/\d+일 후/)
  if (!match || match.index == null) return message

  const highlighted = match[0]
  const startIndex = match.index

  return (
    <>
      {message.slice(0, startIndex)}
      <span className="font-semibold text-primary">{highlighted}</span>
      {message.slice(startIndex + highlighted.length)}
    </>
  )
}

function TimelineRail({
  steps,
  onStepSelect,
}: {
  steps: CompanyTimelineStep[]
  onStepSelect?: (step: CompanyTimelineStep) => void
}) {
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

                  <div
                    role={step.prevStepId != null ? "button" : undefined}
                    tabIndex={step.prevStepId != null ? 0 : -1}
                    onClick={() => {
                      if (step.prevStepId == null) return
                      onStepSelect?.(step)
                    }}
                    onKeyDown={(event) => {
                      if (step.prevStepId == null) return
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onStepSelect?.(step)
                      }
                    }}
                    className={cn(
                      "rounded-lg px-1 py-1 outline-none",
                      step.prevStepId != null &&
                        "cursor-pointer transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-primary/60",
                    )}
                  >
                    <span className="inline-block rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                      {index + 1}단계
                    </span>
                    <p className="mt-1 truncate text-sm font-semibold text-foreground">{finalLabel}</p>
                    <p className="mt-1 inline-flex rounded-md border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary/90">
                      {step.occurredAt ? formatDate(step.occurredAt) : "-"}
                    </p>
                    {step.diffDays != null && (
                      <span className="mt-1 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        +{step.diffDays}일
                      </span>
                    )}
                  </div>
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
          <p className="text-xs text-muted-foreground mt-2">선택한 날짜를 기준으로 예상 발표 범위를 보여줍니다.</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-2 py-1">
          <button type="button" onClick={handlePrev} className="h-8 w-8 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:bg-accent/60" aria-label="prev month">&lsaquo;</button>
          <span className="text-sm font-medium text-foreground">{monthKey}</span>
          <button type="button" onClick={handleNext} className="h-8 w-8 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:bg-accent/60" aria-label="next month">&rsaquo;</button>
        </div>
      </div>

      {!keyword.trim() || expectedDays == null ? (
        <p className="text-xs text-muted-foreground">전형 키워드를 검색한 뒤 날짜를 선택해 주세요.</p>
      ) : (
        <div className={cn("grid grid-cols-7 gap-2 text-center text-xs transition-all duration-200", isMonthAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0")}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="rounded-md bg-muted/40 py-1 text-muted-foreground">{day}</div>
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
                  "h-14 rounded-xl border border-transparent bg-card/60 px-1 py-1 text-xs shadow-[inset_0_0_0_1px_rgba(59,91,219,0.06)] transition-all",
                  "text-foreground hover:bg-accent/60",
                  isExpectedDate ? "border-primary/45 bg-primary/5" : "",
                  isSelected ? "border-primary/70 bg-primary/12 ring-2 ring-primary/45 shadow-sm" : "",
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
        <div className="mt-3 rounded-lg border border-primary/35 bg-primary/5 px-3 py-2 text-xs text-foreground">
          선택 날짜: {derivedDates.selectedDisplay} · 예상 발표일: {derivedDates.expectedDisplay}
        </div>
      )}
    </div>
  )
}

function RollingDateCalendar({
  prediction,
  selectedDate,
  onDateSelect,
}: {
  prediction: RollingPrediction | null
  selectedDate: string
  onDateSelect: (value: string) => void
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const toKey = (d: Date | null) => {
    if (!d) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }
  const expectedKey = toKey(prediction?.expectedDate ?? null)

  return (
    <div className="rounded-3xl border border-primary/15 bg-gradient-to-b from-card to-background px-4 py-4 shadow-sm">
      <div className="mt-0 flex items-center justify-between rounded-xl border border-border/60 bg-background px-2 py-1">
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

      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs">
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
          const isExpected = expectedKey === dateStr

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDateSelect(dateStr)}
              className={cn(
                "h-14 rounded-xl border border-transparent bg-card/60 px-1 py-1 text-foreground shadow-[inset_0_0_0_1px_rgba(59,91,219,0.06)] cursor-pointer transition-all hover:bg-accent/50",
                isExpected && "border-primary/45 bg-primary/5",
                isSelected && "border-primary/70 bg-primary/12 ring-2 ring-primary/45 shadow-sm",
              )}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <span className="text-[11px]">{day}</span>
                {isExpected && <span className="rounded bg-primary/15 px-1 text-[10px] text-primary">예상</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RollingSection({ companyName, steps }: { companyName: string; steps: CompanyTimeline["rollingSteps"] }) {
  const [stepName, setStepName] = useState("")
  const [prevDate, setPrevDate] = useState("")
  const [prediction, setPrediction] = useState<RollingPrediction | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedStat = useMemo(
    () => steps.find((item) => item.stepName === stepName) ?? null,
    [steps, stepName],
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!stepName.trim() || !prevDate) {
        setPrediction(null)
        return
      }
      setLoading(true)
      try {
        const result = await fetchRollingPrediction(companyName, stepName.trim(), prevDate)
        if (!cancelled) setPrediction(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [companyName, stepName, prevDate])

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-1">수시 전형 예측</h3>
      <p className="mb-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground/85">
        선택 전형, 이전 합격일 날짜 기준 예상 발표일을 보여줍니다.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={stepName}
          onChange={(event) => {
            setStepName(event.target.value)
            setPrediction(null)
          }}
          className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground"
          required
        >
          <option value="">전형 선택</option>
          {steps.map((item) => (
            <option key={`rolling-step-${item.stepName}`} value={item.stepName}>
              {item.stepName}
            </option>
          ))}
        </select>
      </div>

      {!stepName.trim() ? (
        <p className="mt-3 text-xs text-muted-foreground">전형을 먼저 선택해 주세요.</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">이전 전형 발표일 선택</p>
          <RollingDateCalendar prediction={prediction} selectedDate={prevDate} onDateSelect={setPrevDate} />
        </>
      )}

      {selectedStat && (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {selectedStat.avgDays != null && (
            <p>평균 {selectedStat.avgDays}일 · 최소 {selectedStat.minDays ?? "-"}일 · 최대 {selectedStat.maxDays ?? "-"}일</p>
          )}
          {selectedStat.noResponseCount > 0 && (
            <p className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
              <span aria-hidden="true">✓</span>
              <span>참고: 결과발표 미수신 제보가 있어요</span>
            </p>
          )}
        </div>
      )}

      {prediction && (
        <div className="mt-3 rounded-xl border border-primary/35 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <p>예상 발표일: <span className="font-semibold">{formatDateYmd(prediction.expectedDate)}</span></p>
          <p>예상 범위: {formatDateYmd(prediction.expectedStartDate)} ~ {formatDateYmd(prediction.expectedEndDate)}</p>
        </div>
      )}
      {loading && <p className="mt-2 text-xs text-muted-foreground">예상일 계산 중...</p>}
    </section>
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
  const leadTimeSectionRef = useRef<HTMLElement | null>(null)
  const normalizedKeyword = keyword.trim().toLowerCase()

  const regularTimelines = timeline?.regularTimelines ?? []
  const rollingSteps = timeline?.rollingSteps ?? []
  const hasRegular = regularTimelines.length > 0
  const hasRolling = rollingSteps.length > 0

  const [activeTab, setActiveTab] = useState<"REGULAR" | "ROLLING">("REGULAR")
  useEffect(() => {
    if (hasRegular) {
      setActiveTab("REGULAR")
    } else if (hasRolling) {
      setActiveTab("ROLLING")
    }
  }, [hasRegular, hasRolling, timeline?.companyName])

  const timelineSuggestions = Array.from(
    new Set(
      regularTimelines
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
  const handleTimelineStepSelect = (step: CompanyTimelineStep) => {
    if (step.prevStepId == null) return
    const label = step.label?.trim()
    if (!label) return
    const extracted = extractKeyword(label)
    onKeywordChange(extracted)
    onKeywordSearch({ preventDefault() {} } as React.FormEvent, extracted)
    leadTimeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (!company) {
    return (
      <div className={cn("flex h-full min-h-[320px] items-center justify-center", className)}>
        <div className="text-center">
          <div className="mb-4 rounded-2xl bg-muted px-6 py-4 inline-block">
            <span className="text-2xl font-bold text-muted-foreground">선택</span>
          </div>
          <p className="text-sm font-medium text-foreground/80">회사를 선택하면 공채/수시 정보를 확인할 수 있어요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-xl font-semibold">{company.companyName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {(hasRegular || hasRolling) && (
          <div className="inline-flex rounded-xl border border-border/60 bg-background p-1">
            {hasRegular && (
              <button
                type="button"
                onClick={() => setActiveTab("REGULAR")}
                className={cn("rounded-lg px-3 py-1.5 text-sm", activeTab === "REGULAR" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                공채
              </button>
            )}
            {hasRolling && (
              <button
                type="button"
                onClick={() => setActiveTab("ROLLING")}
                className={cn("rounded-lg px-3 py-1.5 text-sm", activeTab === "ROLLING" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                수시
              </button>
            )}
          </div>
        )}

        {activeTab === "REGULAR" && hasRegular && (
          <>
            <section className="rounded-2xl border border-border/60 bg-card p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">대표 타임라인</h3>
              <p className="mb-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground/85">
                회사별 전형 흐름과 평균 진행 속도를 확인하세요.
              </p>
              {isTimelineLoading ? (
                <p className="text-sm text-muted-foreground">로딩 중...</p>
              ) : (
                <div className="space-y-6">
                  {regularTimelines.map((unitTimeline, index) => (
                    <div key={`${unitTimeline.unitName}-${unitTimeline.channelType}-${unitTimeline.year}-${index}`}>
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{normalizeUnitCategory(unitTimeline.unitName) ?? unitTimeline.unitName}</span>
                      </div>
                      <TimelineRail steps={unitTimeline.steps} onStepSelect={handleTimelineStepSelect} />
                    </div>
                  ))}
                </div>
              )}
              <TimelineProjectionCalendar timeline={timeline} />
            </section>

            <div className="flex">
              <button
                type="button"
                onClick={() => onQuickReport(company.companyName, "REGULAR")}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 px-5 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/22 hover:shadow-md"
              >
                오늘 결과 발표 제보하기
              </button>
            </div>

            <section ref={leadTimeSectionRef} className="rounded-2xl border border-border/60 bg-card p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">전형 기간 검색</h3>
              <p className="mb-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground/85">
                전형 키워드로 합격 발표까지 걸린 기간을 확인하세요.
              </p>

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
                  className="h-10 w-15 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                        <p key={message}>{renderLeadTimeMessage(message)}</p>
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
          </>
        )}

        {activeTab === "ROLLING" && hasRolling && (
          <>
            <RollingSection companyName={company.companyName} steps={rollingSteps} />
            <div className="flex">
              <button
                type="button"
                onClick={() => onQuickReport(company.companyName, "ROLLING")}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-5 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-500/18 hover:shadow-md dark:text-emerald-300"
              >
                수시 발표 제보하기
              </button>
            </div>
          </>
        )}

        {!hasRegular && !hasRolling && (
          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-sm font-medium text-foreground/85">공채/수시 데이터가 아직 없습니다.</p>
          </section>
        )}
      </div>
    </div>
  )
}
