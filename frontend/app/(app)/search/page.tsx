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
  fetchReportSteps,
  createReport,
} from "@/lib/api"
import type {
  CompanySearchItem,
  CompanyTimeline,
  KeywordLeadTime,
  RecruitmentChannelType,
  ReportStep,
} from "@/lib/types"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { ThemeToggle } from "@/components/theme-toggle"
import { CompanyDetailSheet } from "@/components/company-detail-sheet"
import { CompanyDetailPanel } from "@/components/company-detail-panel"
import { CompanyChatRoom } from "@/components/chat/company-chat-room"
import { cn } from "@/lib/utils"
import { UNIT_CATEGORY_EXAMPLES, UNIT_CATEGORY_OPTIONS } from "@/lib/unit-category"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

const CHANNEL_LABELS: Record<RecruitmentChannelType, string> = {
  FIRST_HALF: "상반기",
  SECOND_HALF: "하반기",
  ALWAYS: "상시",
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

  // report modal states
  const [reportCompany, setReportCompany] = useState("")
  const [reportSuggestions, setReportSuggestions] = useState<CompanySearchItem[]>([])
  const [reportChannelType, setReportChannelType] = useState<RecruitmentChannelType | "">("")
  const [reportUnitName, setReportUnitName] = useState("")
  const [reportDate, setReportDate] = useState(() => getKoreaToday())
  const [reportSteps, setReportSteps] = useState<ReportStep[]>([])
  const [selectedStepKey, setSelectedStepKey] = useState<string>("")
  const [reportStepNameRaw, setReportStepNameRaw] = useState("")
  const [isReportSubmitting, setIsReportSubmitting] = useState(false)
  const [reportMessage, setReportMessage] = useState<string | null>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [showReportSuggestions, setShowReportSuggestions] = useState(true)
  const [isReportCompanyLocked, setIsReportCompanyLocked] = useState(false)

  const isDesktop = useMediaQuery("(min-width: 768px)")
  const normalizedQuery = useMemo(() => query.trim(), [query])
  const normalizedReportCompany = useMemo(() => reportCompany.trim(), [reportCompany])
  const reportUnitExamples = reportUnitName ? UNIT_CATEGORY_EXAMPLES[reportUnitName] ?? [] : []
  const prevReportUnitRef = useRef<string>("")
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
    setReportUnitName("")
    setReportSteps([])
    setSelectedStepKey("")
    setReportStepNameRaw("")
  }, [reportChannelType])

  useEffect(() => {
    if (prevReportCompanyRef.current === normalizedReportCompany) return
    prevReportCompanyRef.current = normalizedReportCompany
    setReportChannelType("")
    setReportUnitName("")
    setReportSteps([])
    setSelectedStepKey("")
    setReportStepNameRaw("")
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

  const openReportModal = (companyName?: string, withToday?: boolean) => {
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

    setReportChannelType("")
    setReportUnitName("")
    setReportSteps([])
    setSelectedStepKey("")
    setReportStepNameRaw("")
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

  const handleReportSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const companyName = normalizedReportCompany
    if (!companyName) return

    if (!reportChannelType) {
      setReportMessage("채용 종류를 선택해 주세요.")
      return
    }

    if (!reportUnitName) {
      setReportMessage("직군을 선택해 주세요.")
      return
    }

    const isOther = selectedStepKey === "OTHER"
    const stepId = !isOther && selectedStepKey ? Number(selectedStepKey) : null
    const stepNameRaw = isOther ? reportStepNameRaw.trim() : null

    if (!stepId && !stepNameRaw) {
      setReportMessage("전형을 선택하거나, 기타 전형명을 입력해 주세요.")
      return
    }

    setIsReportSubmitting(true)
    setReportMessage(null)

    try {
      await createReport({
        companyName,
        channelType: reportChannelType as RecruitmentChannelType,
        unitName: reportUnitName,
        reportedDate: toDateInput(reportDate),
        stepId: stepId ?? undefined,
        stepNameRaw: stepNameRaw ?? undefined,
      })

      setReportMessage("리포트가 접수되었습니다. 감사합니다!")
      setSelectedStepKey("")
      setReportStepNameRaw("")
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
    if (!normalizedReportCompany || !reportUnitName || !reportChannelType) {
      setReportSteps([])
      setSelectedStepKey("")
      return
    }

    let cancelled = false
    const handle = setTimeout(async () => {
      const unitChanged = prevReportUnitRef.current !== reportUnitName
      if (unitChanged) prevReportUnitRef.current = reportUnitName

      const data = await fetchReportSteps(
        normalizedReportCompany,
        reportChannelType as RecruitmentChannelType,
        reportUnitName,
      )

      if (cancelled) return
      setReportSteps(data ?? [])

      if (!data || data.length === 0) {
        setSelectedStepKey("OTHER")
      } else if (unitChanged || !selectedStepKey || selectedStepKey === "OTHER") {
        setSelectedStepKey(String(data[0].stepId))
      }
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [normalizedReportCompany, reportChannelType, reportUnitName]) // eslint-disable-line react-hooks/exhaustive-deps

  // 데스크탑 전환 시 모바일 시트 닫기
  useEffect(() => {
    if (isDesktop) setSheetOpen(false)
  }, [isDesktop])

  return (
    <div className="container mx-auto max-w-[1400px] px-4 py-6">
      <Button
        type="button"
        onClick={() => openReportModal()}
        className="fixed bottom-24 right-6 z-40 rounded-full px-6 py-3 shadow-lg shadow-primary/20 md:bottom-8"
      >
        리포트
      </Button>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>리포트</DialogTitle>
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
                <label className="text-sm font-medium text-foreground">채용 종류</label>
                <Select value={reportChannelType} onValueChange={(v) => setReportChannelType(v as RecruitmentChannelType)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="채용 종류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST_HALF">{CHANNEL_LABELS.FIRST_HALF}</SelectItem>
                    <SelectItem value="SECOND_HALF">{CHANNEL_LABELS.SECOND_HALF}</SelectItem>
                    <SelectItem value="ALWAYS">{CHANNEL_LABELS.ALWAYS}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">직군 선택</label>
              <Select
                value={reportUnitName}
                onValueChange={(value) => {
                  setReportUnitName(value)
                  setReportSteps([])
                  setSelectedStepKey("")
                  setReportStepNameRaw("")
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="직군 선택" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_CATEGORY_OPTIONS.map((unit) => (
                    <SelectItem key={`report-unit-${unit.value}`} value={unit.value}>
                      {unit.label}
                      {unit.hint ? ` (${unit.hint})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {reportUnitExamples.length > 0 && (
                <p className="text-xs text-muted-foreground">예시: {reportUnitExamples.join(", ")}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">결과 발표일</label>
                <Input
                  type="date"
                  value={toDateInput(reportDate)}
                  onChange={(e) => setReportDate(new Date(`${e.target.value}T00:00:00+09:00`))}
                  className="h-11 max-w-[220px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">전형 선택</label>
                <Select value={selectedStepKey} onValueChange={setSelectedStepKey}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="전형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportSteps.map((step) => (
                      <SelectItem key={`step-${step.stepId}`} value={String(step.stepId)}>
                        {step.stepName}
                      </SelectItem>
                    ))}
                    <SelectItem value="OTHER">기타</SelectItem>
                  </SelectContent>
                </Select>

                {selectedStepKey === "OTHER" && (
                  <Input
                    value={reportStepNameRaw}
                    onChange={(e) => setReportStepNameRaw(e.target.value)}
                    placeholder="기타 전형명을 입력해 주세요."
                    className="h-11"
                  />
                )}
              </div>
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
        <ThemeToggle />
      </header>

      {/* Search Area */}
      <section className="mb-6 rounded-2xl border border-border/60 bg-card p-3 md:p-4">
        <form onSubmit={handleSearch}>
          <div className="flex gap-2">
            <Input
              type="search"
              placeholder="회사명을 입력해 주세요."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowRelatedSuggestions(true)
              }}
              className="h-12 rounded-xl border-border bg-card"
            />
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
      <section className="grid gap-6 md:grid-cols-[400px_minmax(0,1fr)]">
        {/* Results List */}
        <div className="min-w-0">
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

          {showRelatedSuggestions && normalizedQuery && relatedResults.length > 0 && !exactMatch && (
            <div className="mb-4 rounded-2xl border border-border/50 bg-card p-4">
              <p className="text-sm font-medium text-foreground mb-2">연관 검색어</p>
              <div className="flex flex-wrap gap-2">
                {relatedResults.map((company) => (
                  <button
                    key={`related-${company.companyName}`}
                    type="button"
                    onClick={() => {
                      setQuery(company.companyName)
                      runSearch(company.companyName)
                    }}
                    className="px-3 py-1.5 rounded-full border border-border/60 text-sm text-foreground hover:bg-accent/60"
                  >
                    {company.companyName}
                  </button>
                ))}
              </div>
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
              onQuickReport={(companyName) => openReportModal(companyName, true)}
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
        onQuickReport={(companyName) => openReportModal(companyName, true)}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}



