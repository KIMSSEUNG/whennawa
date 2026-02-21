"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  searchCompanies,
  fetchCompanyTimeline,
  fetchCompanyLeadTime,
  fetchRollingReportStepNames,
  createReport,
  getUser,
  logout,
} from "@/lib/api"
import type {
  CompanySearchItem,
  CompanyTimeline,
  KeywordLeadTime,
  RecruitmentChannelType,
  RecruitmentMode,
} from "@/lib/types"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { ThemeToggle } from "@/components/theme-toggle"
import { CompanyDetailSheet } from "@/components/company-detail-sheet"
import { CompanyDetailPanel } from "@/components/company-detail-panel"
import { CompanyChatRoom } from "@/components/chat/company-chat-room"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toCompanySlug } from "@/lib/company-slug"

function formatKoDate(value: unknown) {
  if (!value) return "-"
  const d = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function getKoreaToday() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 60 * 60000)
  return new Date(kst.getFullYear(), kst.getMonth(), kst.getDate())
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [searchedQuery, setSearchedQuery] = useState("")
  const [results, setResults] = useState<CompanySearchItem[]>([])
  const [relatedResults, setRelatedResults] = useState<CompanySearchItem[]>([])
  const [showRelatedSuggestions, setShowRelatedSuggestions] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [selectedCompany, setSelectedCompany] = useState<CompanySearchItem | null>(null)
  const [timeline, setTimeline] = useState<CompanyTimeline | null>(null)
  const [leadTime, setLeadTime] = useState<KeywordLeadTime | null>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [lastLeadTimeKeyword, setLastLeadTimeKeyword] = useState("")
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [isLeadTimeLoading, setIsLeadTimeLoading] = useState(false)
  const [isCalendarVisible, setIsCalendarVisible] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // report modal states
  const [reportCompany, setReportCompany] = useState("")
  const [reportSuggestions, setReportSuggestions] = useState<CompanySearchItem[]>([])
  const [reportMode, setReportMode] = useState<RecruitmentMode>("REGULAR")
  const [reportChannelType, setReportChannelType] = useState<RecruitmentChannelType>("ALWAYS")
  const [reportPrevDate, setReportPrevDate] = useState(() => getKoreaToday())
  const [reportCurrentStepName, setReportCurrentStepName] = useState("")
  const [reportDate, setReportDate] = useState(() => getKoreaToday())
  const [reportRollingNoResponse, setReportRollingNoResponse] = useState(false)
  const [rollingStepSuggestions, setRollingStepSuggestions] = useState<string[]>([])
  const [showRollingStepSuggestions, setShowRollingStepSuggestions] = useState(false)
  const [reportPrevStepName, setReportPrevStepName] = useState("")
  const [rollingPrevStepSuggestions, setRollingPrevStepSuggestions] = useState<string[]>([])
  const [showRollingPrevStepSuggestions, setShowRollingPrevStepSuggestions] = useState(false)
  const [isReportSubmitting, setIsReportSubmitting] = useState(false)
  const [reportMessage, setReportMessage] = useState<string | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [showReportSuggestions, setShowReportSuggestions] = useState(true)
  const [isReportCompanyLocked, setIsReportCompanyLocked] = useState(false)

  const isDesktop = useMediaQuery("(min-width: 768px)")
  const normalizedQuery = useMemo(() => query.trim(), [query])
  const normalizedReportCompany = useMemo(() => reportCompany.trim(), [reportCompany])
  const prevReportCompanyRef = useRef<string>("")
  const restoredFromUrlRef = useRef(false)

  const syncSearchUrl = (q: string | null, companyName: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (q && q.trim()) {
      params.set("q", q.trim())
    } else {
      params.delete("q")
    }
    if (companyName && companyName.trim()) {
      params.set("company", companyName.trim())
    } else {
      params.delete("company")
    }
    const qs = params.toString()
    router.replace(`/search${qs ? `?${qs}` : ""}`)
  }

  useEffect(() => {
    setReportChannelType("ALWAYS")
  }, [reportChannelType])

  useEffect(() => {
    if (reportMode === "REGULAR") {
      setReportRollingNoResponse(false)
      setReportPrevDate(getKoreaToday())
      setReportCurrentStepName("")
      setRollingStepSuggestions([])
      setShowRollingStepSuggestions(false)
      return
    }
    setReportChannelType("ALWAYS")
    setReportPrevDate(getKoreaToday())
    setReportCurrentStepName("")
    setReportPrevStepName("")
    setReportRollingNoResponse(false)
    setRollingStepSuggestions([])
    setShowRollingStepSuggestions(false)
    setRollingPrevStepSuggestions([])
    setShowRollingPrevStepSuggestions(false)
  }, [reportMode])

  useEffect(() => {
    if (prevReportCompanyRef.current === normalizedReportCompany) return
    prevReportCompanyRef.current = normalizedReportCompany
    setReportChannelType("ALWAYS")
    setReportPrevDate(getKoreaToday())
    setReportCurrentStepName("")
    setReportPrevStepName("")
    setReportRollingNoResponse(false)
    setRollingStepSuggestions([])
    setShowRollingStepSuggestions(false)
    setRollingPrevStepSuggestions([])
    setShowRollingPrevStepSuggestions(false)
    setReportDate(getKoreaToday())
  }, [normalizedReportCompany])

  const exactMatch = useMemo(() => {
    if (!normalizedQuery) return false
    return relatedResults.some((c) => c.companyName?.toLowerCase() === normalizedQuery.toLowerCase())
  }, [relatedResults, normalizedQuery])

  const runSearch = async (value: string, syncUrl = true) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setIsSearching(true)
    setHasSearched(true)
    setSearchedQuery(trimmed)
    setShowRelatedSuggestions(false)

    // 검색할 때 디테일 초기화
    setSelectedCompany(null)
    setTimeline(null)
    setLeadTime(null)
    setSelectedCalendarDate(null)
    setIsCalendarVisible(false)
    setKeyword("")

    try {
      const data = await searchCompanies(trimmed)
      setResults(data ?? [])
      if (syncUrl) {
        syncSearchUrl(trimmed, null)
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    await runSearch(query)
  }

  const handleSelectCompany = async (
    company: CompanySearchItem,
    syncUrl = true,
    openSheetOnMobile = true,
  ) => {
    setSelectedCompany(company)
    setTimeline(null)
    setLeadTime(null)
    setSelectedCalendarDate(null)
    setIsCalendarVisible(false)
    setKeyword("")
    setLastLeadTimeKeyword("")
    setIsTimelineLoading(true)

    try {
      const detail = await fetchCompanyTimeline(company.companyName)
      setTimeline(detail)
      if (syncUrl) {
        const currentQ = (searchedQuery || normalizedQuery).trim()
        syncSearchUrl(currentQ || null, company.companyName)
      }
    } finally {
      setIsTimelineLoading(false)
    }

    if (!isDesktop && openSheetOnMobile) setSheetOpen(true)
  }

  useEffect(() => {
    if (restoredFromUrlRef.current) return
    const q = (searchParams?.get("q") ?? "").trim()
    const company = (searchParams?.get("company") ?? "").trim()
    if (!q && !company) {
      restoredFromUrlRef.current = true
      return
    }

    restoredFromUrlRef.current = true
    ;(async () => {
      const initialQuery = q || company
      if (initialQuery) {
        setQuery(initialQuery)
        await runSearch(initialQuery, false)
      }
      if (company) {
        await handleSelectCompany({ companyName: company, lastResultAt: null }, false, false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    let mounted = true

    const loadAuth = async () => {
      try {
        const user = await getUser()
        if (!mounted) return
        setIsAuthenticated(Boolean(user))
      } catch {
        if (!mounted) return
        setIsAuthenticated(false)
      }
    }

    const handleSessionUpdate = () => {
      loadAuth()
    }

    loadAuth()
    window.addEventListener("session_update", handleSessionUpdate)
    window.addEventListener("storage", handleSessionUpdate)

    return () => {
      mounted = false
      window.removeEventListener("session_update", handleSessionUpdate)
      window.removeEventListener("storage", handleSessionUpdate)
    }
  }, [])

  const handleMobileLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
      setIsAuthenticated(false)
      router.push("/login")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const openReportModal = (
    companyName?: string,
    withToday?: boolean,
    preferredMode?: RecruitmentMode,
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

    setReportChannelType("ALWAYS")
    setReportCurrentStepName("")
    setReportPrevStepName("")
    setReportRollingNoResponse(false)
    setRollingPrevStepSuggestions([])
    setShowRollingPrevStepSuggestions(false)
    if (preferredMode) {
      setReportMode(preferredMode)
    }
    if (withToday) setReportDate(getKoreaToday())
    setReportMessage(null)
    setIsReportOpen(true)
  }

  const handleLeadTimeSearch = async (e: React.FormEvent, keywordOverride?: string) => {
    e.preventDefault()
    if (!selectedCompany) return

    const trimmed = (keywordOverride ?? keyword).trim()
    if (!trimmed) return

    setIsLeadTimeLoading(true)
    try {
      const result = await fetchCompanyLeadTime(selectedCompany.companyName, trimmed)
      const hasLeadTime =
        result != null && (result.minDays != null || result.maxDays != null || result.medianDays != null)

      setLeadTime(hasLeadTime ? result : null)
      setSelectedCalendarDate(null)
      setIsCalendarVisible(hasLeadTime)
      setLastLeadTimeKeyword(trimmed)
    } finally {
      setIsLeadTimeLoading(false)
    }
  }

  const handleCalendarDateSelect = (dateStr: string) => {
    if (!leadTime || !keyword.trim()) return
    if (leadTime.minDays == null || leadTime.maxDays == null) return
    setSelectedCalendarDate(dateStr)
  }

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    if (lastLeadTimeKeyword && value.trim() !== lastLeadTimeKeyword) {
      setLeadTime(null)
      setSelectedCalendarDate(null)
      setIsCalendarVisible(false)
      setLastLeadTimeKeyword("")
    }
  }

  const toDateInput = (value: Date) => {
    const utc = value.getTime() + value.getTimezoneOffset() * 60000
    const kst = new Date(utc + 9 * 60 * 60000)
    return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}-${String(kst.getDate()).padStart(
      2,
      "0",
    )}`
  }

  const reportModalTitle = "오늘 결과발표 제보하기"
  const reportModalDescription = "현재 전형명을 필수로 입력해 주세요. 결과 미수신일 경우 날짜 없이 제보할 수 있어요."

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
    if (!reportRollingNoResponse && prevStepName === currentStepName) {
      setReportMessage("이전 전형명과 현재 전형명은 다르게 입력해 주세요.")
      return
    }

    if (!reportRollingNoResponse) {
      const today = getKoreaToday()
      if (reportDate > today) {
        setReportMessage("현재 전형 발표일은 오늘까지 입력할 수 있어요.")
        return
      }
      if (reportPrevDate >= reportDate) {
        setReportMessage("이전 전형 발표일은 현재 전형 발표일보다 이전 날짜여야 해요.")
        return
      }
    }

    if (isRegular && !reportRollingNoResponse && !reportPrevDate) {
      setReportMessage("이전 전형 발표일을 입력해 주세요.")
      return
    }

    if (isRegular && !reportRollingNoResponse && !reportDate) {
      setReportMessage("현재 전형 발표일을 입력해 주세요.")
      return
    }

    setIsReportSubmitting(true)
    setReportMessage(null)

    try {
      await createReport({
        companyName,
        recruitmentMode: reportMode,
        rollingResultType: isRegular
          ? reportRollingNoResponse
            ? "NO_RESPONSE_REPORTED"
            : "DATE_REPORTED"
          : reportRollingNoResponse
            ? "NO_RESPONSE_REPORTED"
            : "DATE_REPORTED",
        channelType: isRegular ? ("ALWAYS" as RecruitmentChannelType) : undefined,
        unitName: undefined,
        prevReportedDate: reportRollingNoResponse ? undefined : toDateInput(reportPrevDate),
        currentStepName: isRegular
          ? reportRollingNoResponse
            ? undefined
            : prevStepName
          : currentStepName,
        reportedDate: reportRollingNoResponse
          ? undefined
          : toDateInput(reportDate),
        stepId: undefined,
        stepNameRaw: isRegular
          ? currentStepName
          : reportRollingNoResponse
            ? undefined
            : currentStepName,
      })

      setReportMessage("리포트가 접수되었습니다. 감사합니다!")
      setReportPrevStepName("")
      setReportCurrentStepName("")
      setIsReportOpen(false)
    } catch (error) {
      console.error("Failed to create report", error)
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

  // 연관 검색어 (debounce)
  useEffect(() => {
    if (!normalizedQuery) {
      setRelatedResults([])
      return
    }

    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await searchCompanies(normalizedQuery)
      if (cancelled) return
      setRelatedResults(data ?? [])
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [normalizedQuery])

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
    if (!normalizedReportCompany) {
      setRollingStepSuggestions([])
      setShowRollingStepSuggestions(false)
      setRollingPrevStepSuggestions([])
      setShowRollingPrevStepSuggestions(false)
      return
    }

    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await fetchRollingReportStepNames(normalizedReportCompany, reportCurrentStepName)
      if (cancelled) return
      setRollingStepSuggestions(data ?? [])
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [reportMode, normalizedReportCompany, reportCurrentStepName])

  useEffect(() => {
    if (!normalizedReportCompany || reportRollingNoResponse) {
      setRollingPrevStepSuggestions([])
      setShowRollingPrevStepSuggestions(false)
      return
    }

    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await fetchRollingReportStepNames(normalizedReportCompany, reportPrevStepName)
      if (cancelled) return
      setRollingPrevStepSuggestions(data ?? [])
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [normalizedReportCompany, reportPrevStepName, reportRollingNoResponse])

  // 데스크탑 전환 시 모바일 시트 닫기
  useEffect(() => {
    if (isDesktop) setSheetOpen(false)
  }, [isDesktop])

  return (
    <div className="container mx-auto max-w-[1400px] px-4 py-6">
      <Button
        type="button"
        onClick={() => openReportModal()}
        className="fixed bottom-24 right-6 z-40 h-14 rounded-full border border-primary/30 bg-primary px-7 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary/90 md:bottom-8"
      >
        발표날짜 제보
      </Button>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{reportModalTitle}</DialogTitle>
            <DialogDescription className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground/85">
              {reportModalDescription}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">회사명</label>
                <Input
                  value={reportCompany}
                  onChange={(e) => {
                    setReportCompany(e.target.value)
                    setShowReportSuggestions(true)
                  }}
                  placeholder="회사명을 입력해 주세요."
                  className="h-11 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground"
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
                        className="px-3 py-1.5 rounded-full border border-border/60 text-xs text-foreground hover:bg-muted/50"
                      >
                        {company.companyName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">제보 유형</label>
                <Select value={reportMode} onValueChange={(v) => setReportMode(v as RecruitmentMode)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">공채</SelectItem>
                    <SelectItem value="ROLLING">수시</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 flex items-center">
                <button
                  type="button"
                  onClick={() => setReportRollingNoResponse((prev) => !prev)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    reportRollingNoResponse
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  결과발표 메일을 받지 못했습니다
                </button>
              </div>
              {reportRollingNoResponse && (
                <p className="md:col-span-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                  현재 전형명만 입력하면 제보할 수 있어요.
                </p>
              )}
              {!reportRollingNoResponse && (
              <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">이전 전형 발표일</label>
                <Input
                  type="date"
                  value={toDateInput(reportPrevDate)}
                  onChange={(e) => setReportPrevDate(new Date(`${e.target.value}T00:00:00+09:00`))}
                  className="h-11 max-w-[220px]"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">현재 전형 발표일</label>
                <Input
                  type="date"
                  value={toDateInput(reportDate)}
                  onChange={(e) => setReportDate(new Date(`${e.target.value}T00:00:00+09:00`))}
                  className="h-11 max-w-[220px]"
                  required
                />
              </div>
              </>
              )}
              {!reportRollingNoResponse && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">이전 전형명</label>
                  <div className="relative">
                    <Input
                      value={reportPrevStepName}
                      onChange={(e) => {
                        setReportPrevStepName(e.target.value)
                        setShowRollingPrevStepSuggestions(true)
                      }}
                      onFocus={() => setShowRollingPrevStepSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowRollingPrevStepSuggestions(false), 120)}
                      placeholder="예: 서류합격"
                      className="h-11"
                      required
                    />
                    {showRollingPrevStepSuggestions && rollingPrevStepSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
                        <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">전형 연관 검색어</p>
                        <div className="max-h-56 overflow-auto">
                          {rollingPrevStepSuggestions.map((stepName) => (
                            <button
                              key={`rolling-prev-step-${stepName}`}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setReportPrevStepName(stepName)
                                setShowRollingPrevStepSuggestions(false)
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
              )}
              <div className={cn("space-y-2", reportRollingNoResponse ? "md:col-span-2" : "")}>
                <label className="text-sm font-medium text-foreground">현재 전형명</label>
                <div className="relative">
                  <Input
                    value={reportCurrentStepName}
                    onChange={(e) => {
                      setReportCurrentStepName(e.target.value)
                      setShowRollingStepSuggestions(true)
                    }}
                    onFocus={() => setShowRollingStepSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowRollingStepSuggestions(false), 120)}
                    placeholder="예: 1차면접"
                    className="h-11"
                    required
                  />
                  {showRollingStepSuggestions && rollingStepSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
                      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">전형 연관 검색어</p>
                      <div className="max-h-56 overflow-auto">
                        {rollingStepSuggestions.map((stepName) => (
                          <button
                            key={`rolling-step-${stepName}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setReportCurrentStepName(stepName)
                              setShowRollingStepSuggestions(false)
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
              <p className="md:col-span-2 text-xs text-muted-foreground">
                예시: {reportMode === "REGULAR" ? "지원서 접수 마감" : "지원서 접수"} {"->"} 서류 합격
                <br />
                코딩테스트 합격 {"->"} 1차 면접 합격
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

      {/* Header - mobile only */}
      <header className="mb-6 flex items-start justify-between md:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="언제나와 로고" width={24} height={24} className="rounded-md" priority />
            <span className="text-base font-semibold text-foreground">언제나와</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">회사 검색</h1>
          <p className="text-sm text-muted-foreground">회사명을 검색해서 지원 이력과 전형 타임라인을 확인해 보세요.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleMobileLogout}
              disabled={isLoggingOut}
              className="inline-flex h-9 min-w-[88px] items-center justify-center rounded-lg border border-border/60 bg-card px-3 text-sm font-medium text-foreground hover:bg-accent/60 disabled:opacity-50"
            >
              {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 min-w-[88px] items-center justify-center rounded-lg border border-border/60 bg-card px-3 text-sm font-medium text-foreground hover:bg-accent/60"
            >
              로그인
            </Link>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Search Area */}
      <section className="mb-6 rounded-2xl border border-border/60 bg-card p-3 md:p-4">
        <form onSubmit={handleSearch}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="search"
                placeholder="회사명을 입력해 주세요."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowRelatedSuggestions(true)
                }}
                onFocus={() => setShowRelatedSuggestions(true)}
                className="h-12 rounded-xl border-border bg-card"
              />
              {showRelatedSuggestions && normalizedQuery && relatedResults.length > 0 && !exactMatch && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border/60 bg-card p-2 shadow-lg">
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">연관 검색어</p>
                  <div className="max-h-64 overflow-auto">
                    {relatedResults.slice(0, 5).map((company) => (
                      <button
                        key={`related-${company.companyName}`}
                        type="button"
                        onClick={() => {
                          setQuery(company.companyName)
                          setShowRelatedSuggestions(false)
                          runSearch(company.companyName)
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-accent/60"
                      >
                        {company.companyName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !normalizedQuery}
              className="h-12 px-6 min-w-[80px] rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSearching ? "검색 중..." : "검색"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">회사명으로 검색하고, 선택 후 상세 타임라인을 확인할 수 있습니다.</p>
        </form>
      </section>

      {/* Results Area */}
      <section
        className={cn(
          "grid gap-6",
          hasSearched ? "md:grid-cols-[400px_minmax(0,1fr)]" : "md:grid-cols-1",
        )}
      >
        {/* Results List */}
        <div className={cn("min-w-0", !hasSearched && "mx-auto w-full max-w-xl")}>
          {hasSearched && (
            <div className="mb-3 rounded-xl border border-border/60 bg-background px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">최근 검색</span>
                <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                  결과 {results.length}건
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{searchedQuery}</p>
            </div>
          )}

          {isSearching ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-[2em] text-muted-foreground animate-pulse">검색 중...</span>
            </div>
          ) : !hasSearched ? (
            <EmptyState
              title="회사 검색"
              description="회사명을 입력해 저장된 지원 이력을 찾아보세요."
            />
          ) : results.length === 0 ? (
            <EmptyState
              title="검색 결과 없음"
              description={`"${searchedQuery}"에 해당하는 회사 이력을 찾지 못했어요.`}
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {results.map((company) => (
                  <button
                    key={company.companyName}
                    onClick={() => handleSelectCompany(company)}
                    className={cn(
                      "group w-full text-left rounded-2xl border border-border/50 bg-card p-4 transition-all",
                      "hover:shadow-md hover:border-primary/40 hover:bg-accent/20 active:scale-[0.99]",
                      selectedCompany?.companyName === company.companyName &&
                        isDesktop &&
                        "ring-2 ring-primary/70",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="min-w-0 truncate font-semibold text-foreground">{company.companyName}</h3>
                      <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                        상세 보기
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">저장된 타임라인 보기</p>
                    <div className="mt-2">
                      <Link
                        href={`/company/${toCompanySlug(company.companyName)}`}
                        onClick={(event) => event.stopPropagation()}
                        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                      >
                        공개 페이지
                      </Link>
                    </div>
                  </button>
                ))}
              </div>

              {selectedCompany && (
                <CompanyChatRoom
                  companyId={timeline?.companyId ?? null}
                  companyName={selectedCompany.companyName}
                />
              )}
            </div>
          )}
        </div>

        {/* Desktop: Detail Panel */}
        {isDesktop && hasSearched && results.length > 0 && (
          <div className="min-h-[400px]">
            <div className="min-h-[400px] rounded-2xl border border-border/50 bg-card">
            <CompanyDetailPanel
              company={selectedCompany}
              timeline={timeline}
              leadTime={leadTime}
              keyword={keyword}
              lastLeadTimeKeyword={lastLeadTimeKeyword}
              onKeywordChange={handleKeywordChange}
              onKeywordSearch={handleLeadTimeSearch}
              selectedCalendarDate={selectedCalendarDate}
              onCalendarDateSelect={handleCalendarDateSelect}
              isCalendarVisible={isCalendarVisible}
              isTimelineLoading={isTimelineLoading}
              isLeadTimeLoading={isLeadTimeLoading}
              onQuickReport={(companyName, mode) => openReportModal(companyName, true, mode)}
              className="h-full"
            />
            </div>
          </div>
        )}
      </section>

      {/* Mobile: Bottom Sheet */}
      <CompanyDetailSheet
        company={selectedCompany}
        timeline={timeline}
        leadTime={leadTime}
        keyword={keyword}
        lastLeadTimeKeyword={lastLeadTimeKeyword}
        onKeywordChange={handleKeywordChange}
        onKeywordSearch={handleLeadTimeSearch}
        selectedCalendarDate={selectedCalendarDate}
        onCalendarDateSelect={handleCalendarDateSelect}
        isCalendarVisible={isCalendarVisible}
        isTimelineLoading={isTimelineLoading}
        isLeadTimeLoading={isLeadTimeLoading}
        onQuickReport={(companyName, mode) => openReportModal(companyName, true, mode)}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
