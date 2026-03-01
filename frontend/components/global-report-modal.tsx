"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  createReport,
  fetchRollingReportCurrentStepNames,
  fetchRollingReportPrevStepNames,
  resolveRollingStepPair,
  searchCompanies,
} from "@/lib/api"
import type { CompanySearchItem, RecruitmentMode } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export function GlobalReportModal() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [reportCompany, setReportCompany] = useState("")
  const [reportSuggestions, setReportSuggestions] = useState<CompanySearchItem[]>([])
  const [reportMode, setReportMode] = useState<RecruitmentMode>("REGULAR")
  const [reportPrevDate, setReportPrevDate] = useState(() => getKoreaToday())
  const [reportPrevStepName, setReportPrevStepName] = useState("")
  const [reportCurrentStepName, setReportCurrentStepName] = useState("")
  const [reportNotificationMessage, setReportNotificationMessage] = useState("")
  const [reportDate, setReportDate] = useState(() => getKoreaToday())
  const [reportTodayFixed, setReportTodayFixed] = useState(false)
  const [reportNotifySubscribers, setReportNotifySubscribers] = useState(false)
  const [reportRollingNoResponse, setReportRollingNoResponse] = useState(false)
  const [rollingPrevStepSuggestions, setRollingPrevStepSuggestions] = useState<string[]>([])
  const [rollingCurrentStepSuggestions, setRollingCurrentStepSuggestions] = useState<string[]>([])
  const [showPrevStepSuggestions, setShowPrevStepSuggestions] = useState(false)
  const [showCurrentStepSuggestions, setShowCurrentStepSuggestions] = useState(false)
  const [isReportSubmitting, setIsReportSubmitting] = useState(false)
  const [reportMessage, setReportMessage] = useState<string | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [showReportSuggestions, setShowReportSuggestions] = useState(true)
  const [isReportCompanyLocked, setIsReportCompanyLocked] = useState(false)

  const normalizedReportCompany = useMemo(() => reportCompany.trim(), [reportCompany])
  const prevStepSuggestionOptions = useMemo(() => {
    const merged = [...rollingPrevStepSuggestions]
    const unique = Array.from(new Set(merged))
    return unique.filter((name) => name && name.trim())
  }, [rollingPrevStepSuggestions])
  const currentStepSuggestionOptions = useMemo(() => {
    const merged = [...rollingCurrentStepSuggestions]
    const unique = Array.from(new Set(merged))
    return unique.filter((name) => name && name.trim())
  }, [rollingCurrentStepSuggestions])
  const prevReportCompanyRef = useRef<string>("")
  const reportOpenedFromUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (reportMode === "REGULAR") {
      setReportRollingNoResponse(false)
      setReportPrevDate(getKoreaToday())
      setReportPrevStepName("")
      setReportCurrentStepName("")
      setReportNotificationMessage("")
      setReportDate(getKoreaToday())
      setRollingPrevStepSuggestions([])
      setRollingCurrentStepSuggestions([])
      setShowPrevStepSuggestions(false)
      setShowCurrentStepSuggestions(false)
      return
    }
    setReportPrevDate(getKoreaToday())
    setReportPrevStepName("")
    setReportCurrentStepName("")
    setReportNotificationMessage("")
    setReportDate(getKoreaToday())
    setReportRollingNoResponse(false)
    setRollingPrevStepSuggestions([])
    setRollingCurrentStepSuggestions([])
    setShowPrevStepSuggestions(false)
    setShowCurrentStepSuggestions(false)
  }, [reportMode])

  useEffect(() => {
    if (prevReportCompanyRef.current === normalizedReportCompany) return
    prevReportCompanyRef.current = normalizedReportCompany
    setReportPrevDate(getKoreaToday())
    setReportPrevStepName("")
    setReportCurrentStepName("")
    setReportNotificationMessage("")
    setReportDate(getKoreaToday())
    setReportRollingNoResponse(false)
    setRollingPrevStepSuggestions([])
    setRollingCurrentStepSuggestions([])
    setShowPrevStepSuggestions(false)
    setShowCurrentStepSuggestions(false)
  }, [normalizedReportCompany])

  const openReportModal = (
    companyName?: string,
    withToday?: boolean,
    preferredMode?: RecruitmentMode,
    todayFixed?: boolean,
    notifySubscribers?: boolean,
  ) => {
    if (companyName) {
      setReportCompany(companyName)
      setShowReportSuggestions(false)
      setReportSuggestions([])
      setIsReportCompanyLocked(true)
    } else {
      setReportCompany("")
      setShowReportSuggestions(true)
      setIsReportCompanyLocked(false)
    }

    setReportCurrentStepName("")
    setReportPrevStepName("")
    setReportNotificationMessage("")
    setReportTodayFixed(Boolean(todayFixed))
    setReportNotifySubscribers(Boolean(notifySubscribers))
    setReportRollingNoResponse(false)
    if (preferredMode) setReportMode(preferredMode)
    if (notifySubscribers) setReportMode("REGULAR")
    if (withToday) {
      setReportPrevDate(getKoreaToday())
      setReportDate(getKoreaToday())
    }
    setReportMessage(null)
    setIsReportOpen(true)
  }

  useEffect(() => {
    const reportFlag = searchParams?.get("report")
    if (reportFlag !== "1") return

    const rawMode = (searchParams?.get("reportMode") ?? "").toUpperCase()
    const preferredMode: RecruitmentMode | undefined =
      rawMode === "REGULAR" || rawMode === "ROLLING" ? (rawMode as RecruitmentMode) : undefined
    const reportCompanyFromUrl = (searchParams?.get("reportCompany") ?? "").trim()
    const todayAnnouncement = searchParams?.get("reportToday") === "1"
    const notifySubscribers = searchParams?.get("reportNotify") === "1"

    const signature = [
      pathname ?? "",
      reportFlag,
      rawMode,
      reportCompanyFromUrl,
      todayAnnouncement ? "1" : "0",
      notifySubscribers ? "1" : "0",
    ].join("|")
    if (reportOpenedFromUrlRef.current === signature) return
    reportOpenedFromUrlRef.current = signature

    openReportModal(
      reportCompanyFromUrl || undefined,
      todayAnnouncement,
      preferredMode,
      todayAnnouncement,
      notifySubscribers,
    )

    const nextParams = new URLSearchParams(searchParams?.toString() ?? "")
    nextParams.delete("report")
    nextParams.delete("reportMode")
    nextParams.delete("reportCompany")
    nextParams.delete("reportToday")
    nextParams.delete("reportNotify")
    const qs = nextParams.toString()
    router.replace(`${pathname ?? "/"}${qs ? `?${qs}` : ""}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, pathname])

  const applyPairFromPrevIfEmpty = async (nextPrevStepName: string) => {
    if (reportPrevStepName.trim() || reportCurrentStepName.trim()) return
    const paired = await resolveRollingStepPair("prev_to_current", nextPrevStepName)
    if (paired) setReportCurrentStepName(paired)
  }

  const applyPairFromCurrentIfEmpty = async (nextCurrentStepName: string) => {
    if (reportPrevStepName.trim() || reportCurrentStepName.trim()) return
    const paired = await resolveRollingStepPair("current_to_prev", nextCurrentStepName)
    if (paired) setReportPrevStepName(paired)
  }

  const handleReportSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const companyName = normalizedReportCompany
    if (!companyName) return

    const isRegular = reportMode === "REGULAR"
    const prevStepName = reportPrevStepName.trim()
    const currentStepName = reportCurrentStepName.trim()

    if (!currentStepName) {
      setReportMessage("현재 전형명을 입력해 주세요.")
      return
    }
    if (!reportRollingNoResponse && !prevStepName) {
      setReportMessage("이전 전형명을 입력해 주세요.")
      return
    }
    if (!reportRollingNoResponse) {
      const today = getKoreaToday()
      const currentDate = reportTodayFixed ? today : reportDate
      if (currentDate > today) {
        setReportMessage("현재 전형 발표일은 오늘까지 입력할 수 있어요.")
        return
      }
      if (reportPrevDate >= currentDate) {
        setReportMessage("이전 전형 발표일은 현재 전형 발표일보다 이전 날짜여야 해요.")
        return
      }
    }
    if (isRegular && !reportRollingNoResponse && !reportPrevDate) {
      setReportMessage("이전 전형 발표일을 입력해 주세요.")
      return
    }

    setIsReportSubmitting(true)
    setReportMessage(null)
    try {
      const currentDate = reportTodayFixed ? getKoreaToday() : reportDate
      await createReport({
        companyName,
        recruitmentMode: reportMode,
        rollingResultType: reportRollingNoResponse ? "NO_RESPONSE_REPORTED" : "DATE_REPORTED",
        prevReportedDate: reportRollingNoResponse ? undefined : toDateInput(reportPrevDate),
        prevStepName: reportRollingNoResponse ? undefined : prevStepName,
        currentStepName,
        reportedDate: reportRollingNoResponse ? undefined : toDateInput(currentDate),
        notificationMessage: reportNotifySubscribers ? (reportNotificationMessage.trim() || undefined) : undefined,
        todayAnnouncement: reportNotifySubscribers,
      })

      setReportMessage("리포트가 접수되었습니다. 감사합니다!")
      setReportPrevStepName("")
      setReportCurrentStepName("")
      setReportNotificationMessage("")
      setIsReportOpen(false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : ""
      if (msg.includes("Too many reports") || msg.includes("429")) {
        setReportMessage("연속 요청이 감지되었습니다. 잠시 후 다시 시도해 주세요.")
      } else {
        setReportMessage("리포트 접수에 실패했습니다.")
      }
    } finally {
      setIsReportSubmitting(false)
    }
  }

  useEffect(() => {
    if (!normalizedReportCompany || !showReportSuggestions) {
      setReportSuggestions([])
      return
    }

    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await searchCompanies(normalizedReportCompany, 5)
      if (cancelled) return
      setReportSuggestions(data ?? [])
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [normalizedReportCompany, showReportSuggestions])

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await fetchRollingReportPrevStepNames(normalizedReportCompany, reportPrevStepName)
      if (cancelled) return
      setRollingPrevStepSuggestions(data ?? [])
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [normalizedReportCompany, reportPrevStepName])

  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await fetchRollingReportCurrentStepNames(normalizedReportCompany, reportCurrentStepName)
      if (cancelled) return
      setRollingCurrentStepSuggestions(data ?? [])
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [normalizedReportCompany, reportCurrentStepName])

  const todayInput = toDateInput(getKoreaToday())
  const prevDateMaxInput = (() => {
    const max = reportTodayFixed ? getKoreaToday() : new Date(reportDate)
    max.setDate(max.getDate() - 1)
    return toDateInput(max)
  })()
  const currentDateMinInput = (() => {
    const min = new Date(reportPrevDate)
    min.setDate(min.getDate() + 1)
    return toDateInput(min)
  })()
  const reportModalTitle = reportTodayFixed ? "오늘 결과 발표가 났어요" : "발표날짜 제보"
  const reportModalDescription = reportTodayFixed
    ? "오늘 결과 발표 제보 모드입니다. 현재 전형 발표일은 오늘로 고정됩니다."
    : "이전 전형/현재 전형과 발표일을 함께 입력해 주세요. 결과 미수신은 현재 전형만 입력하면 돼요."

  return (
    <>
      <Button
        type="button"
        onClick={() => openReportModal(undefined, true, undefined, false, false)}
        className="fixed bottom-24 right-6 z-40 h-14 rounded-full border border-primary/30 bg-primary px-7 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary/90 md:bottom-8"
      >
        발표날짜 제보
      </Button>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="w-[min(94vw,720px)] max-w-xl max-h-[88dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{reportModalTitle}</DialogTitle>
            <DialogDescription className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground/85">
              {reportModalDescription}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">회사명</label>
                <Input
                  value={reportCompany}
                  onChange={(e) => {
                    setReportCompany(e.target.value)
                    setShowReportSuggestions(true)
                  }}
                  placeholder="회사명을 입력해 주세요."
                  className="h-11 w-full text-sm placeholder:text-sm disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground"
                  required
                  readOnly={isReportCompanyLocked}
                  disabled={isReportCompanyLocked}
                />

                {reportSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {reportSuggestions.map((company) => (
                      <button
                        key={`report-suggest-${company.companyName}`}
                        type="button"
                        onClick={() => {
                          setReportCompany(company.companyName)
                          setShowReportSuggestions(false)
                          setReportSuggestions([])
                        }}
                        className="rounded-full border border-border/70 px-3 py-1 text-xs text-foreground hover:bg-accent/60"
                      >
                        {company.companyName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">전형 구분</label>
                <Select value={reportMode} onValueChange={(v) => setReportMode(v as RecruitmentMode)} disabled={reportNotifySubscribers}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="전형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">공채</SelectItem>
                    <SelectItem value="ROLLING">수시</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !reportNotifySubscribers
                    setReportNotifySubscribers(next)
                    if (next) {
                      setReportTodayFixed(true)
                      setReportMode("REGULAR")
                      setReportRollingNoResponse(false)
                    } else {
                      setReportTodayFixed(false)
                      setReportNotificationMessage("")
                    }
                  }}
                  className={cn(
                    "w-full min-w-0 rounded-full border px-3 py-2 text-[11px] sm:text-xs whitespace-normal break-keep text-left sm:text-center leading-relaxed",
                    reportNotifySubscribers
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/70 text-muted-foreground hover:bg-accent/60",
                  )}
                >
                  오늘 결과 발표가 났어요 (구독자 알림)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !reportRollingNoResponse
                    setReportRollingNoResponse(next)
                    if (next) {
                      setReportNotifySubscribers(false)
                      setReportTodayFixed(false)
                      setReportNotificationMessage("")
                    }
                  }}
                  className={cn(
                    "w-full min-w-0 rounded-full border px-3 py-2 text-[11px] sm:text-xs whitespace-normal break-keep text-left sm:text-center leading-relaxed",
                    reportRollingNoResponse
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "border-border/70 text-muted-foreground hover:bg-accent/60",
                  )}
                >
                  결과발표 메일을 받지 못했습니다
                </button>
              </div>

              {reportRollingNoResponse && (
                <p className="md:col-span-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm leading-relaxed break-keep text-emerald-700 dark:text-emerald-300">
                  현재 전형명만 입력하면 제보할 수 있어요. (이전 전형명/날짜는 생략)
                </p>
              )}

              <div className={cn("space-y-2", reportRollingNoResponse ? "md:col-span-2" : "")}>
                <label className="text-sm font-medium text-foreground">이전 전형명</label>
                <div className="relative">
                  <Input
                    value={reportPrevStepName}
                    onChange={(e) => setReportPrevStepName(e.target.value)}
                    onFocus={() => setShowPrevStepSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPrevStepSuggestions(false), 120)}
                    placeholder="예: 1차 면접"
                    className="h-11 w-full text-sm"
                    required={!reportRollingNoResponse}
                  />
                  {showPrevStepSuggestions && prevStepSuggestionOptions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
                      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">이전 전형 연관 검색어</p>
                      <div className="max-h-56 overflow-auto">
                        {prevStepSuggestionOptions.map((stepName) => (
                          <button
                            key={`rolling-prev-step-${stepName}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={async () => {
                              await applyPairFromPrevIfEmpty(stepName)
                              setReportPrevStepName(stepName)
                              setShowPrevStepSuggestions(false)
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-accent/60"
                          >
                            {stepName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">현재 전형명</label>
                <div className="relative">
                  <Input
                    value={reportCurrentStepName}
                    onChange={(e) => setReportCurrentStepName(e.target.value)}
                    onFocus={() => setShowCurrentStepSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCurrentStepSuggestions(false), 120)}
                    placeholder="예: 1차 면접 발표"
                    className="h-11 w-full text-sm"
                    required
                  />
                  {showCurrentStepSuggestions && currentStepSuggestionOptions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
                      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">현재 전형 연관 검색어</p>
                      <div className="max-h-56 overflow-auto">
                        {currentStepSuggestionOptions.map((stepName) => (
                          <button
                            key={`rolling-current-step-${stepName}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={async () => {
                              await applyPairFromCurrentIfEmpty(stepName)
                              setReportCurrentStepName(stepName)
                              setShowCurrentStepSuggestions(false)
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-accent/60"
                          >
                            {stepName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!reportRollingNoResponse && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">이전 전형 발표일</label>
                    <Input
                      type="date"
                      value={toDateInput(reportPrevDate)}
                      onChange={(e) => setReportPrevDate(new Date(`${e.target.value}T00:00:00+09:00`))}
                      className="h-11 w-full text-sm"
                      max={prevDateMaxInput}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      현재 전형 발표일{reportTodayFixed ? " (오늘 고정)" : ""}
                    </label>
                    <Input
                      type="date"
                      value={reportTodayFixed ? todayInput : toDateInput(reportDate)}
                      onChange={(e) => setReportDate(new Date(`${e.target.value}T00:00:00+09:00`))}
                      className="h-11 w-full text-sm"
                      min={currentDateMinInput}
                      max={todayInput}
                      readOnly={reportTodayFixed}
                      disabled={reportTodayFixed}
                      required
                    />
                  </div>
                </>
              )}

              {reportNotifySubscribers && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">알림 메시지 (선택)</label>
                  <Input
                    value={reportNotificationMessage}
                    onChange={(e) => setReportNotificationMessage(e.target.value.slice(0, 120))}
                    placeholder="첫 제보자인 경우 구독자에게 전달할 한 줄 메시지"
                    className="h-11 w-full text-sm placeholder:text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    첫 제보자의 메시지만 알림에 반영돼요. ({reportNotificationMessage.length}/120)
                  </p>
                </div>
              )}

              <p className="md:col-span-2 text-xs leading-relaxed break-keep text-muted-foreground">
                ( 필기 전형-&gt; 필기 발표 , 1차 면접-&gt; 1차 면접 발표 )와 같이 전형-&gt; 전형 발표 기준으로 제보 부탁드리겠습니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isReportSubmitting}>
                {isReportSubmitting ? "접수 중..." : "리포트 등록"}
              </Button>
              {reportMessage && <span className="text-sm text-muted-foreground">{reportMessage}</span>}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

