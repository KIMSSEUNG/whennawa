"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarIcon } from "lucide-react"
import {
  createReport,
  fetchReportJobCategories,
  fetchRollingReportCurrentStepNames,
  fetchRollingReportPrevStepNames,
  resolveRollingStepPair,
  searchCompanies,
} from "@/lib/api"
import type { ReportJobCategory } from "@/lib/api"
import type { CompanySearchItem, InterviewDifficulty, RecruitmentMode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function getKoreaToday() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 60 * 60000)
  return new Date(kst.getFullYear(), kst.getMonth(), kst.getDate())
}

function toDateInput(value: Date) {
  const utc = value.getTime() + value.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 60 * 60000)
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}-${String(kst.getDate()).padStart(2, "0")}`
}

function toDate(value: string) {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function toDateOrNull(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split("-").map(Number)
  const parsed = new Date(y, m - 1, d)
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) return null
  return parsed
}

function toDisplayDate(value: string) {
  const parsed = toDateOrNull(value)
  if (!parsed) return "날짜를 선택해 주세요."
  return parsed.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function normalizeDateInput(value: string) {
  const parsed = toDateOrNull(value)
  if (!parsed) return value
  return toDateInput(parsed)
}

export function GlobalReportModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isCompanyLocked, setIsCompanyLocked] = useState(false)
  const [isModeLocked, setIsModeLocked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState("")
  const [companySuggestions, setCompanySuggestions] = useState<CompanySearchItem[]>([])
  const [isCompanyFocused, setIsCompanyFocused] = useState(false)
  const [mode, setMode] = useState<RecruitmentMode>("REGULAR")

  const [jobCategories, setJobCategories] = useState<ReportJobCategory[]>([])
  const [jobCategoryId, setJobCategoryId] = useState("")
  const [otherJobName, setOtherJobName] = useState("")
  const [rollingJobName, setRollingJobName] = useState("")

  const [prevDate, setPrevDate] = useState(() => toDateInput(getKoreaToday()))
  const [reportedDate, setReportedDate] = useState(() => toDateInput(getKoreaToday()))
  const [prevStepName, setPrevStepName] = useState("")
  const [currentStepName, setCurrentStepName] = useState("")
  const [noResponse, setNoResponse] = useState(false)
  const [isPrevDateOpen, setIsPrevDateOpen] = useState(false)
  const [isReportedDateOpen, setIsReportedDateOpen] = useState(false)
  const [isPrevStepFocused, setIsPrevStepFocused] = useState(false)
  const [isCurrentStepFocused, setIsCurrentStepFocused] = useState(false)

  const [prevSuggestions, setPrevSuggestions] = useState<string[]>([])
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([])
  const [interviewReviewContent, setInterviewReviewContent] = useState("")
  const [interviewDifficulty, setInterviewDifficulty] = useState<InterviewDifficulty>("MEDIUM")

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{
        companyName?: string
        mode?: RecruitmentMode
        todayAnnouncement?: boolean
      }>
      const payload = customEvent.detail ?? {}
      if (payload.companyName && payload.companyName.trim()) {
        setCompanyName(payload.companyName.trim())
        setIsCompanyLocked(true)
      } else {
        setIsCompanyLocked(false)
      }
      if (payload.mode) {
        setMode(payload.mode)
        setIsModeLocked(true)
      } else {
        setIsModeLocked(false)
      }
      setMessage(null)
      setIsOpen(true)
    }

    window.addEventListener("open_report_modal", handleOpen as EventListener)
    return () => {
      window.removeEventListener("open_report_modal", handleOpen as EventListener)
    }
  }, [])

  const trimmedCompany = useMemo(() => companyName.trim(), [companyName])
  const selectedJobCategoryName = useMemo(() => {
    const id = Number(jobCategoryId)
    if (!Number.isFinite(id)) return ""
    return jobCategories.find((item) => item.jobCategoryId === id)?.jobCategoryName ?? ""
  }, [jobCategoryId, jobCategories])
  const isOtherCategory = selectedJobCategoryName.trim() === "기타"
  const showCompanySuggestionList =
    !isCompanyLocked && isCompanyFocused && trimmedCompany.length > 0 && companySuggestions.length > 0
  const showPrevSuggestionList = isPrevStepFocused && prevStepName.trim().length > 0 && prevSuggestions.length > 0
  const showCurrentSuggestionList = isCurrentStepFocused && currentStepName.trim().length > 0 && currentSuggestions.length > 0

  useEffect(() => {
    if (!trimmedCompany) {
      setCompanySuggestions([])
      return
    }
    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await searchCompanies(trimmedCompany, 5)
      if (cancelled) return
      setCompanySuggestions(data ?? [])
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [trimmedCompany])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const data = await fetchReportJobCategories()
      if (cancelled) return
      setJobCategories(data ?? [])
      setJobCategoryId((prev) => {
        if (prev && (data ?? []).some((item) => String(item.jobCategoryId) === prev)) return prev
        return data?.[0] ? String(data[0].jobCategoryId) : ""
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [trimmedCompany])

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await fetchRollingReportPrevStepNames(trimmedCompany, prevStepName, mode, {
        jobCategoryId: mode === "ROLLING" ? null : jobCategoryId ? Number(jobCategoryId) : null,
      })
      if (cancelled) return
      setPrevSuggestions(Array.from(new Set((data ?? []).filter((item) => item && item.trim()))))
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [trimmedCompany, prevStepName, mode, jobCategoryId])

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await fetchRollingReportCurrentStepNames(trimmedCompany, currentStepName, mode, {
        jobCategoryId: mode === "ROLLING" ? null : jobCategoryId ? Number(jobCategoryId) : null,
      })
      if (cancelled) return
      setCurrentSuggestions(Array.from(new Set((data ?? []).filter((item) => item && item.trim()))))
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [trimmedCompany, currentStepName, mode, jobCategoryId])

  const applyPairFromPrevIfEmpty = async (value: string) => {
    if (!value.trim() || currentStepName.trim()) return
    const paired = await resolveRollingStepPair("prev_to_current", value, mode, {
      companyName: trimmedCompany || undefined,
      jobCategoryId: mode === "ROLLING" ? null : jobCategoryId ? Number(jobCategoryId) : null,
    })
    if (paired) setCurrentStepName(paired)
  }

  const applyPairFromCurrentIfEmpty = async (value: string) => {
    if (!value.trim() || prevStepName.trim()) return
    const paired = await resolveRollingStepPair("current_to_prev", value, mode, {
      companyName: trimmedCompany || undefined,
      jobCategoryId: mode === "ROLLING" ? null : jobCategoryId ? Number(jobCategoryId) : null,
    })
    if (paired) setPrevStepName(paired)
  }

  const handleSelectPrevSuggestion = async (value: string) => {
    setPrevStepName(value)
    setIsPrevStepFocused(false)
    if (!currentStepName.trim()) {
      const paired = await resolveRollingStepPair("prev_to_current", value, mode, {
        companyName: trimmedCompany || undefined,
        jobCategoryId: mode === "ROLLING" ? null : jobCategoryId ? Number(jobCategoryId) : null,
      })
      if (paired) setCurrentStepName(paired)
    }
  }

  const handleSelectCurrentSuggestion = async (value: string) => {
    setCurrentStepName(value)
    setIsCurrentStepFocused(false)
    if (!prevStepName.trim()) {
      const paired = await resolveRollingStepPair("current_to_prev", value, mode, {
        companyName: trimmedCompany || undefined,
        jobCategoryId: mode === "ROLLING" ? null : jobCategoryId ? Number(jobCategoryId) : null,
      })
      if (paired) setPrevStepName(paired)
    }
  }

  const handleSelectCompanySuggestion = (value: string) => {
    setCompanyName(value)
    setIsCompanyFocused(false)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!trimmedCompany) {
      setMessage("회사명을 입력해 주세요.")
      return
    }
    if (!currentStepName.trim()) {
      setMessage("현재 전형명을 입력해 주세요.")
      return
    }

    if (mode === "ROLLING") {
      if (!rollingJobName.trim()) {
        setMessage("직업명을 입력해 주세요.")
        return
      }
      if (rollingJobName.trim().length > 100) {
        setMessage("직업명은 100자 이내로 입력해 주세요.")
        return
      }
    } else {
      const selected = Number(jobCategoryId)
      if (!Number.isFinite(selected) || selected <= 0) {
        setMessage("직군을 선택해 주세요.")
        return
      }
      if (isOtherCategory && !otherJobName.trim()) {
        setMessage("기타 직군명을 입력해 주세요.")
        return
      }
      if (isOtherCategory && otherJobName.trim().length > 20) {
        setMessage("기타 직군명은 20자 이내로 입력해 주세요.")
        return
      }
    }

    if (!noResponse) {
      if (!prevStepName.trim()) {
        setMessage("이전 전형명을 입력해 주세요.")
        return
      }
      if (!prevDate || !reportedDate) {
        setMessage("이전/현재 발표일을 입력해 주세요.")
        return
      }
      if (!toDateOrNull(prevDate) || !toDateOrNull(reportedDate)) {
        setMessage("발표일은 YYYY-MM-DD 형식으로 입력해 주세요.")
        return
      }
      if (toDate(prevDate) >= toDate(reportedDate)) {
        setMessage("이전 발표일은 현재 발표일보다 이전이어야 합니다.")
        return
      }
    }

    setIsSubmitting(true)
    setMessage(null)
    try {
      await createReport({
        companyName: trimmedCompany,
        recruitmentMode: mode,
        jobCategoryId: mode === "ROLLING" ? undefined : Number(jobCategoryId),
        rollingJobName: mode === "ROLLING" ? rollingJobName.trim() : undefined,
        otherJobName: mode === "ROLLING" ? undefined : isOtherCategory ? otherJobName.trim() : undefined,
        rollingResultType: noResponse ? "NO_RESPONSE_REPORTED" : "DATE_REPORTED",
        prevReportedDate: noResponse ? undefined : prevDate,
        prevStepName: noResponse ? undefined : prevStepName.trim(),
        currentStepName: currentStepName.trim(),
        reportedDate: noResponse ? undefined : reportedDate,
        interviewReviewContent: interviewReviewContent.trim() ? interviewReviewContent.trim() : undefined,
        interviewDifficulty: interviewReviewContent.trim() ? interviewDifficulty : undefined,
      })
      setMessage("제보가 접수되었습니다.")
      setIsOpen(false)
    } catch {
      setMessage("제보 접수에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setIsCompanyLocked(false)
          setIsModeLocked(false)
          setIsOpen(true)
        }}
        className="fixed bottom-24 right-6 z-40 h-14 rounded-full border border-primary/30 bg-primary px-7 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary/90 md:bottom-8"
      >
        발표날짜 제보
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[min(94vw,720px)] max-w-xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>발표날짜 제보</DialogTitle>
            <DialogDescription>수시는 직업명, 공채/인턴은 직군 기준으로 제보해 주세요.</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={submit}
            onKeyDownCapture={(e) => {
              if (e.key !== "Enter") return
              const target = e.target as HTMLElement | null
              const tagName = target?.tagName?.toLowerCase()
              if (tagName === "textarea") return
              e.preventDefault()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">회사명</label>
              <div className="relative">
                <Input
                  value={companyName}
                  onChange={(e) => {
                    if (isCompanyLocked) return
                    setCompanyName(e.target.value)
                  }}
                  onFocus={() => {
                    if (isCompanyLocked) return
                    setIsCompanyFocused(true)
                  }}
                  onBlur={() => setIsCompanyFocused(false)}
                  placeholder="예: 네이버"
                  readOnly={isCompanyLocked}
                  className={cn(isCompanyLocked && "pointer-events-none cursor-default")}
                  required
                />
                {showCompanySuggestionList && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
                    <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">연관 회사명</p>
                    <div className="max-h-48 overflow-auto">
                      {companySuggestions.slice(0, 8).map((item) => (
                        <button
                          key={`company-suggest-${item.companyName}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectCompanySuggestion(item.companyName)}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-accent/60"
                        >
                          {item.companyName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">전형 구분</label>
                <Select value={mode} onValueChange={(v) => setMode(v as RecruitmentMode)}>
                  <SelectTrigger disabled={isModeLocked} className={cn(isModeLocked && "pointer-events-none cursor-default opacity-100")}>
                    <SelectValue placeholder="전형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">공채</SelectItem>
                    <SelectItem value="INTERN">인턴</SelectItem>
                    <SelectItem value="ROLLING">수시</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === "ROLLING" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">직업명</label>
                  <Input value={rollingJobName} onChange={(e) => setRollingJobName(e.target.value.slice(0, 100))} placeholder="예: 기계설비 개발" required />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">직군</label>
                    <Select value={jobCategoryId} onValueChange={setJobCategoryId}>
                      <SelectTrigger><SelectValue placeholder="직군 선택" /></SelectTrigger>
                      <SelectContent className="max-h-[220px] overflow-y-auto">
                        {jobCategories.map((item) => (
                          <SelectItem key={`job-${item.jobCategoryId}`} value={String(item.jobCategoryId)}>
                            {item.jobCategoryName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isOtherCategory && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">기타 직군명</label>
                      <Input
                        value={otherJobName}
                        onChange={(e) => setOtherJobName(e.target.value.slice(0, 20))}
                        placeholder="예: 데이터플랫폼"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">이전 전형명</label>
                <div className="relative">
                  <Input
                    value={prevStepName}
                    onChange={(e) => setPrevStepName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return
                      e.preventDefault()
                      void applyPairFromPrevIfEmpty(prevStepName)
                    }}
                    onFocus={() => setIsPrevStepFocused(true)}
                    onBlur={() => {
                      setIsPrevStepFocused(false)
                      applyPairFromPrevIfEmpty(prevStepName)
                    }}
                    placeholder="예: 서류"
                    required={!noResponse}
                  />
                  {showPrevSuggestionList && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
                      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">추천 전형명</p>
                      <div className="max-h-48 overflow-auto">
                        {prevSuggestions.slice(0, 8).map((name) => (
                          <button
                            key={`prev-${name}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-accent/60"
                            onClick={() => handleSelectPrevSuggestion(name)}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">현재 전형명</label>
                <div className="relative">
                  <Input
                    value={currentStepName}
                    onChange={(e) => setCurrentStepName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return
                      e.preventDefault()
                      void applyPairFromCurrentIfEmpty(currentStepName)
                    }}
                    onFocus={() => setIsCurrentStepFocused(true)}
                    onBlur={() => {
                      setIsCurrentStepFocused(false)
                      applyPairFromCurrentIfEmpty(currentStepName)
                    }}
                    placeholder="예: 서류 발표"
                    required
                  />
                  {showCurrentSuggestionList && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
                      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">추천 전형명</p>
                      <div className="max-h-48 overflow-auto">
                        {currentSuggestions.slice(0, 8).map((name) => (
                          <button
                            key={`current-${name}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-accent/60"
                            onClick={() => handleSelectCurrentSuggestion(name)}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNoResponse((prev) => !prev)}
              className={cn(
                "inline-flex h-10 items-center rounded-lg border px-3 text-sm transition-colors",
                noResponse ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted/40",
              )}
            >
              결과 발표 메일을 받지 못했습니다
            </button>

            {!noResponse && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">이전 발표일</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={prevDate}
                      onChange={(e) => setPrevDate(e.target.value)}
                      onBlur={() => setPrevDate((prev) => normalizeDateInput(prev))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault()
                      }}
                      placeholder="YYYY-MM-DD"
                      inputMode="numeric"
                      required
                    />
                    <Popover open={isPrevDateOpen} onOpenChange={setIsPrevDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-10 w-10 shrink-0 border-border/70 bg-background hover:bg-accent/40"
                          aria-label={`이전 발표일 달력 열기 (${toDisplayDate(prevDate)})`}
                        >
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={toDateOrNull(prevDate) ?? undefined}
                          onSelect={(value) => {
                            if (!value) return
                            setPrevDate(toDateInput(value))
                            setIsPrevDateOpen(false)
                          }}
                          disabled={(date) => {
                            const current = toDateOrNull(reportedDate)
                            return current ? date >= current : false
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">현재 발표일</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={reportedDate}
                      onChange={(e) => setReportedDate(e.target.value)}
                      onBlur={() => setReportedDate((prev) => normalizeDateInput(prev))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault()
                      }}
                      placeholder="YYYY-MM-DD"
                      inputMode="numeric"
                      required
                    />
                    <Popover open={isReportedDateOpen} onOpenChange={setIsReportedDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-10 w-10 shrink-0 border-border/70 bg-background hover:bg-accent/40"
                          aria-label={`현재 발표일 달력 열기 (${toDisplayDate(reportedDate)})`}
                        >
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={toDateOrNull(reportedDate) ?? undefined}
                          onSelect={(value) => {
                            if (!value) return
                            setReportedDate(toDateInput(value))
                            setIsReportedDateOpen(false)
                          }}
                          disabled={(date) => {
                            const prev = toDateOrNull(prevDate)
                            return prev ? date <= prev : false
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">면접 후기 (선택)</p>
              <p className="text-xs text-muted-foreground">
                추 후 면접을 보게 될 사용자들을 위해 적어주시면 감사하겠습니다.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">면접 난이도</label>
                  <Select
                    value={interviewDifficulty}
                    onValueChange={(value) => setInterviewDifficulty(value as InterviewDifficulty)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="난이도 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">쉬움</SelectItem>
                      <SelectItem value="MEDIUM">보통</SelectItem>
                      <SelectItem value="HARD">어려움</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                value={interviewReviewContent}
                onChange={(e) => setInterviewReviewContent(e.target.value.slice(0, 2000))}
                placeholder="면접 분위기, 질문 유형, 준비 팁 등을 적어주세요."
                className="nawa-scrollbar h-[18vh] resize-none overflow-x-hidden overflow-y-auto [field-sizing:fixed] rounded-xl border-border/70 bg-gradient-to-b from-background to-muted/20 text-sm leading-6"
              />
            </div>

            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "제출 중..." : "제보하기"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
