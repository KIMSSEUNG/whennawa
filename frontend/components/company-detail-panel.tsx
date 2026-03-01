"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CompanySearchItem, CompanyTimeline, KeywordLeadTime } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CompanyDetailPanelProps {
  company: CompanySearchItem | null
  timeline: CompanyTimeline | null
  leadTime: KeywordLeadTime | null
  keyword: string
  lastLeadTimeKeyword: string
  onKeywordChange: (value: string) => void
  onKeywordSearch: (event: React.FormEvent, keywordOverride?: string, modeOverride?: "REGULAR" | "INTERN") => void
  selectedCalendarDate: string | null
  onCalendarDateSelect: (dateStr: string) => void
  isCalendarVisible: boolean
  isTimelineLoading: boolean
  isLeadTimeLoading: boolean
  onQuickReport: (
    companyName: string,
    mode: "REGULAR" | "ROLLING" | "INTERN",
    options?: { todayAnnouncement?: boolean },
  ) => void
  showCompanyHeader?: boolean
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
    messages.push(`${target} 결과는 이전 발표일(지원서 접수/마감) 기준 보통 ${leadTime.medianDays}일 후 발표됐어요.`)
  }

  if (leadTime.minDays != null && leadTime.maxDays != null) {
    if (leadTime.minDays !== leadTime.maxDays) {
      messages.push(`가장 빨랐던 사례는 이전 발표일(지원서 접수/마감) 기준 ${leadTime.minDays}일, 가장 늦었던 사례는 ${leadTime.maxDays}일이었어요.`)
    }
  } else if (leadTime.minDays != null) {
    messages.push(`가장 빨랐던 사례는 이전 발표일(지원서 접수/마감) 기준 ${leadTime.minDays}일이었어요.`)
  } else if (leadTime.maxDays != null) {
    messages.push(`가장 늦었던 사례는 이전 발표일(지원서 접수/마감) 기준 ${leadTime.maxDays}일이었어요.`)
  }

  return messages
}

function renderLeadTimeMessage(message: string) {
  const targetSuffix = " 결과는"
  const targetEnd = message.indexOf(targetSuffix)
  const match = message.match(/\d+일 후/)
  const hasDayHighlight = Boolean(match && match.index != null)
  const dayText = hasDayHighlight ? match![0] : ""
  const dayStart = hasDayHighlight ? match!.index! : -1
  const hasTargetHighlight = targetEnd > 0

  return (
    <>
      {hasTargetHighlight ? (
        <>
          <span className="font-semibold text-primary">{message.slice(0, targetEnd)}</span>
          {message.slice(targetEnd, hasDayHighlight ? dayStart : undefined)}
        </>
      ) : (
        message.slice(0, hasDayHighlight ? dayStart : undefined)
      )}
      {hasDayHighlight && <span className="font-semibold text-primary">{dayText}</span>}
      {hasDayHighlight ? message.slice(dayStart + dayText.length) : ""}
    </>
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
    const hasRange =
      leadTime?.minDays != null &&
      leadTime?.maxDays != null &&
      leadTime.minDays !== leadTime.maxDays
    const minDays = hasRange ? leadTime.minDays : null
    const maxDays = hasRange ? leadTime.maxDays : null
    const minDate = minDays == null ? null : new Date(base)
    const maxDate = maxDays == null ? null : new Date(base)
    if (minDate && minDays != null) minDate.setDate(minDate.getDate() + minDays)
    if (maxDate && maxDays != null) maxDate.setDate(maxDate.getDate() + maxDays)

    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    return {
      expectedKey: toKey(expectedDate),
      minKey: minDate ? toKey(minDate) : null,
      maxKey: maxDate ? toKey(maxDate) : null,
      selectedDisplay: base.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }),
      expectedDisplay: expectedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }),
      minDisplay: minDate ? minDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : null,
      maxDisplay: maxDate ? maxDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : null,
    }
  }, [expectedDays, selectedDate, leadTime?.minDays, leadTime?.maxDays])

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
          <p className="text-xs text-muted-foreground mt-2">이전 전형 발표일을 선택하면 예상 발표일을 바로 확인할 수 있어요.</p>
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
            const isMinDate = derivedDates?.minKey === dateStr
            const isMaxDate = derivedDates?.maxKey === dateStr

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
                  isMinDate ? "ring-1 ring-emerald-400/40" : "",
                  isMaxDate ? "ring-1 ring-rose-400/40" : "",
                  isSelected ? "border-primary/70 bg-primary/12 ring-2 ring-primary/45 shadow-sm" : "",
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px]">{day}</span>
                  {isMinDate && (
                    <span className="rounded bg-emerald-500/10 px-1 text-[10px] text-emerald-700 dark:text-emerald-300">
                      최소
                    </span>
                  )}
                  {isMaxDate && (
                    <span className="rounded bg-rose-500/10 px-1 text-[10px] text-rose-700 dark:text-rose-300">
                      최대
                    </span>
                  )}
                  {isExpectedDate && (
                    <span className="rounded bg-primary/15 px-1 text-[10px] text-primary">
                      <span className="sm:hidden">예상</span>
                      <span className="hidden sm:inline">예상 발표일</span>
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {derivedDates && (
        <div className="mt-3 rounded-xl border border-primary/35 bg-primary/5 px-3 py-3 text-xs text-foreground">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-primary/30 bg-background/80 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">선택 날짜</p>
              <p className="mt-1 text-sm font-semibold text-primary">{derivedDates.selectedDisplay}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-background/80 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">예상 발표일</p>
              <p className="mt-1 text-sm font-semibold text-primary">{derivedDates.expectedDisplay}</p>
            </div>
            {derivedDates.minDisplay && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/90">최소</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{derivedDates.minDisplay}</p>
              </div>
            )}
            {derivedDates.maxDisplay && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2">
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/90">최대</p>
                <p className="mt-1 text-sm font-semibold text-rose-700 dark:text-rose-300">{derivedDates.maxDisplay}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type PredictSectionProps = {
  title: string
  description: string
  stepOptions: string[]
  selectedStep: string
  onStepChange: (value: string) => void
  leadTime: KeywordLeadTime | null
  selectedDate: string | null
  onDateSelect: (dateStr: string) => void
  showCalendar: boolean
  emptyStepText?: string
  noDataText?: string
  noResponseCount?: number
}

function PredictSection({
  title,
  description,
  stepOptions,
  selectedStep,
  onStepChange,
  leadTime,
  selectedDate,
  onDateSelect,
  showCalendar,
  emptyStepText = "전형을 선택해 결과를 확인하세요.",
  noDataText = "해당 전형의 간격 데이터가 부족해요.",
  noResponseCount = 0,
}: PredictSectionProps) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className="mb-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground/85">
        {description}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <Select value={selectedStep} onValueChange={onStepChange}>
          <SelectTrigger className="h-10 rounded-xl border-border/60 bg-card">
            <SelectValue placeholder="전형 선택" />
          </SelectTrigger>
          <SelectContent>
            {stepOptions.map((step) => (
              <SelectItem key={`predict-step-${step}`} value={step}>
                {step}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 rounded-xl border border-border/60 bg-background px-4 py-3">
        {!selectedStep.trim() ? (
          <p className="text-sm text-muted-foreground">{emptyStepText}</p>
        ) : leadTime && (leadTime.medianDays != null || leadTime.minDays != null || leadTime.maxDays != null) ? (
          <div className="space-y-1 text-sm text-foreground">
            {getLeadTimeMessages(selectedStep, leadTime).map((message) => (
              <p key={`predict-msg-${message}`}>{renderLeadTimeMessage(message)}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{noDataText}</p>
        )}
      </div>

      {showCalendar && (
        <>
          <LeadTimeCalendar
            keyword={selectedStep}
            leadTime={leadTime}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
          />
        </>
      )}

      {noResponseCount > 0 && (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
            <span aria-hidden="true">✓</span>
            <span>참고: 결과발표 미수신 제보가 있어요</span>
          </p>
        </div>
      )}
    </section>
  )
}

function RollingSection({
  steps,
  stepName,
  onStepNameChange,
  prevDate,
  onPrevDateChange,
}: {
  steps: CompanyTimeline["rollingSteps"]
  stepName: string
  onStepNameChange: (value: string) => void
  prevDate: string
  onPrevDateChange: (value: string) => void
}) {
  const selectedStat = useMemo(
    () => steps.find((item) => item.stepName === stepName) ?? null,
    [steps, stepName],
  )
  const rollingLeadTime: KeywordLeadTime | null = selectedStat
    ? {
        keyword: stepName,
        medianDays: selectedStat.avgDays,
        minDays: selectedStat.minDays,
        maxDays: selectedStat.maxDays,
      }
    : null

  return (
    <PredictSection
      title="전형 기간 검색"
      description="전형을 선택하고 이전 전형 발표일을 선택해 예상 발표일을 확인하세요."
      stepOptions={steps.map((item) => item.stepName)}
      selectedStep={stepName}
      onStepChange={onStepNameChange}
      leadTime={rollingLeadTime}
      selectedDate={prevDate || null}
      onDateSelect={onPrevDateChange}
      showCalendar={Boolean(stepName.trim())}
      noResponseCount={selectedStat?.noResponseCount ?? 0}
    />
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
  showCompanyHeader = true,
  className,
}: CompanyDetailPanelProps) {
  const leadTimeSectionRef = useRef<HTMLElement | null>(null)

  const regularTimelines = timeline?.regularTimelines ?? []
  const internTimelines = timeline?.internTimelines ?? []
  const rollingSteps = timeline?.rollingSteps ?? []
  const hasRegular = regularTimelines.length > 0
  const hasIntern = internTimelines.length > 0
  const hasRolling = rollingSteps.length > 0

  const [activeTab, setActiveTab] = useState<"REGULAR" | "ROLLING" | "INTERN">("REGULAR")
  const [rollingStepName, setRollingStepName] = useState("")
  const [rollingPrevDate, setRollingPrevDate] = useState("")
  const prevActiveTabRef = useRef<"REGULAR" | "ROLLING" | "INTERN">("REGULAR")
  useEffect(() => {
    if (hasRegular) {
      setActiveTab("REGULAR")
    } else if (hasIntern) {
      setActiveTab("INTERN")
    } else if (hasRolling) {
      setActiveTab("ROLLING")
    }
  }, [hasRegular, hasIntern, hasRolling, timeline?.companyName])

  useEffect(() => {
    setRollingStepName("")
    setRollingPrevDate("")
  }, [timeline?.companyName])

  useEffect(() => {
    if (prevActiveTabRef.current === activeTab) {
      return
    }
    prevActiveTabRef.current = activeTab
    onKeywordChange("")
    setRollingStepName("")
    setRollingPrevDate("")
  }, [activeTab, onKeywordChange])

  const regularSuggestions = Array.from(
    new Set(
      regularTimelines
        .flatMap((unit) => unit.steps)
        .map((step) => step.label)
        .filter((label): label is string => Boolean(label && label.trim())),
    ),
  )

  const internSuggestions = Array.from(
    new Set(
      internTimelines
        .flatMap((unit) => unit.steps)
        .map((step) => step.label)
        .filter((label): label is string => Boolean(label && label.trim())),
    ),
  )

  const handleStepChange = (value: string, mode: "REGULAR" | "INTERN") => {
    onKeywordChange(value)
    if (!value.trim()) return
    onKeywordSearch({ preventDefault() {} } as React.FormEvent, value, mode)
    leadTimeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (!company) {
    return (
      <div className={cn("flex h-full min-h-[320px] items-center justify-center", className)}>
        <div className="text-center">
          <div className="mb-4 rounded-2xl bg-muted px-6 py-4 inline-block">
            <span className="text-2xl font-bold text-muted-foreground">선택</span>
          </div>
          <p className="text-sm font-medium text-foreground/80">회사를 선택하면 공채/인턴/수시 정보를 확인할 수 있어요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {showCompanyHeader && (
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold">{company.companyName}</h2>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {(hasRegular || hasIntern || hasRolling) && (
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
            {hasIntern && (
              <button
                type="button"
                onClick={() => setActiveTab("INTERN")}
                className={cn("rounded-lg px-3 py-1.5 text-sm", activeTab === "INTERN" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                인턴
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
            <div ref={leadTimeSectionRef}>
              <PredictSection
                title="전형 기간 검색"
                description="전형을 선택하고 이전 전형 발표일을 선택해 예상 발표일을 확인하세요."
                stepOptions={regularSuggestions}
                selectedStep={keyword}
                onStepChange={(value) => handleStepChange(value, "REGULAR")}
                leadTime={leadTime}
                selectedDate={selectedCalendarDate}
                onDateSelect={onCalendarDateSelect}
                showCalendar={isCalendarVisible}
                noDataText={
                  lastLeadTimeKeyword
                    ? "해당 검색 결과가 없습니다."
                    : "전형을 선택해 결과를 확인하세요."
                }
              />
            </div>
            <div className="flex">
              <button
                type="button"
                onClick={() => onQuickReport(company.companyName, "REGULAR", { todayAnnouncement: true })}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 px-5 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/22 hover:shadow-md"
              >
                오늘 결과 발표가 났어요
              </button>
            </div>
          </>
        )}

        {activeTab === "INTERN" && hasIntern && (
          <>
            <div ref={leadTimeSectionRef}>
              <PredictSection
                title="전형 기간 검색"
                description="전형을 선택하고 이전 전형 발표일을 선택해 예상 발표일을 확인하세요."
                stepOptions={internSuggestions}
                selectedStep={keyword}
                onStepChange={(value) => handleStepChange(value, "INTERN")}
                leadTime={leadTime}
                selectedDate={selectedCalendarDate}
                onDateSelect={onCalendarDateSelect}
                showCalendar={isCalendarVisible}
                noDataText={
                  lastLeadTimeKeyword
                    ? "해당 검색 결과가 없습니다."
                    : "전형을 선택해 결과를 확인하세요."
                }
              />
            </div>
            <div className="flex">
              <button
                type="button"
                onClick={() => onQuickReport(company.companyName, "INTERN")}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 px-5 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/22 hover:shadow-md"
              >
                인턴 제보하기
              </button>
            </div>
          </>
        )}

        {activeTab === "ROLLING" && hasRolling && (
          <>
            <RollingSection
              steps={rollingSteps}
              stepName={rollingStepName}
              onStepNameChange={setRollingStepName}
              prevDate={rollingPrevDate}
              onPrevDateChange={setRollingPrevDate}
            />
            <div className="flex">
              <button
                type="button"
                onClick={() => onQuickReport(company.companyName, "ROLLING")}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 px-5 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/22 hover:shadow-md"
              >
                수시 제보하기
              </button>
            </div>
          </>
        )}

        {!hasRegular && !hasIntern && !hasRolling && (
          <section className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-sm font-medium text-foreground/85">공채/인턴/수시 데이터가 아직 없습니다.</p>
            <p className="mt-1 text-xs text-muted-foreground">첫 제보를 남겨 데이터 생성을 시작할 수 있어요.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onQuickReport(company.companyName, "REGULAR", { todayAnnouncement: false })}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/22"
              >
                공채 제보하기
              </button>
              <button
                type="button"
                onClick={() => onQuickReport(company.companyName, "INTERN", { todayAnnouncement: false })}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/22"
              >
                인턴 제보하기
              </button>
              <button
                type="button"
                onClick={() => onQuickReport(company.companyName, "ROLLING", { todayAnnouncement: false })}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/22"
              >
                수시 제보하기
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
