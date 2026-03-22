"use client"

import type React from "react"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Building2, Search, Sparkles, TrendingUp } from "lucide-react"
import {
  searchCompanies,
  fetchCompanyStatus,
  fetchCompanyLeadTime,
  createCompany,
} from "@/lib/api"
import type {
  CompanySearchItem,
  CompanyStatus,
  InterviewReview,
  KeywordLeadTime,
} from "@/lib/types"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { CompanyDetailSheet } from "@/components/company-detail-sheet"
import { CompanyDetailPanel } from "@/components/company-detail-panel"
import { CompanyChatRoom } from "@/components/chat/company-chat-room"
import { CompanyIcon } from "@/components/company-icon"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toCompanySlug } from "@/lib/company-slug"
import { fromModeSlug, toModeSlug } from "@/lib/company-detail-route"
import { normalizeCompanyName } from "@/lib/company-name"

function SearchPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [searchedQuery, setSearchedQuery] = useState("")
  const [results, setResults] = useState<CompanySearchItem[]>([])
  const [relatedResults, setRelatedResults] = useState<CompanySearchItem[]>([])
  const [showRelatedSuggestions, setShowRelatedSuggestions] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [selectedCompany, setSelectedCompany] = useState<CompanySearchItem | null>(null)
  const [status, setStatus] = useState<CompanyStatus | null>(null)
  const [leadTime, setLeadTime] = useState<KeywordLeadTime | null>(null)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [lastLeadTimeKeyword, setLastLeadTimeKeyword] = useState("")
  const [isStatusLoading, setIsStatusLoading] = useState(false)
  const [isLeadTimeLoading, setIsLeadTimeLoading] = useState(false)
  const [isCalendarVisible, setIsCalendarVisible] = useState(false)
  const [currentMode, setCurrentMode] = useState<"REGULAR" | "ROLLING" | "INTERN" | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedInterviewReview, setSelectedInterviewReview] = useState<InterviewReview | null>(null)
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [addCompanyMessage, setAddCompanyMessage] = useState<string | null>(null)
  const [isCompanyRequestPopupOpen, setIsCompanyRequestPopupOpen] = useState(false)
  const [companyRequestPopupMessage, setCompanyRequestPopupMessage] = useState("")

  const isDesktop = useMediaQuery("(min-width: 768px)")
  const normalizedQuery = useMemo(() => query.trim(), [query])
  const restoredFromUrlRef = useRef(false)
  const normalizedAddCompanyPreview = useMemo(() => normalizeCompanyName(newCompanyName), [newCompanyName])

  const syncSearchUrl = (
    q: string | null,
    companyName: string | null,
    mode?: "REGULAR" | "ROLLING" | "INTERN" | null,
    stepName?: string | null,
  ) => {
    const currentQs = searchParams?.toString() ?? ""
    const params = new URLSearchParams(currentQs)
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
    if (mode) {
      params.set("mode", toModeSlug(mode))
    } else {
      params.delete("mode")
    }
    if (stepName && stepName.trim()) {
      params.set("step", stepName.trim())
    } else {
      params.delete("step")
    }
    const qs = params.toString()
    if (qs === currentQs) return
    router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false })
  }

  const exactMatch = useMemo(() => {
    if (!normalizedQuery) return false
    return relatedResults.some((c) => c.companyName?.toLowerCase() === normalizedQuery.toLowerCase())
  }, [relatedResults, normalizedQuery])
  const shouldShowRelatedSuggestions =
    showRelatedSuggestions && !isCompanyRequestPopupOpen && Boolean(normalizedQuery) && relatedResults.length > 0 && !exactMatch

  const runSearch = async (value: string, syncUrl = true) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setIsSearching(true)
    setHasSearched(true)
    setSearchedQuery(trimmed)
    setShowRelatedSuggestions(false)

    // 검색할 때 디테일 초기화
    setSelectedCompany(null)
    setStatus(null)
    setLeadTime(null)
    setSelectedCalendarDate(null)
    setIsCalendarVisible(false)
    setKeyword("")
    setCurrentMode(null)
    setCurrentStep(null)

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
    setStatus(null)
    setLeadTime(null)
    setSelectedCalendarDate(null)
    setIsCalendarVisible(false)
    setKeyword("")
    setLastLeadTimeKeyword("")
    setCurrentStep(null)
    setIsStatusLoading(true)

    try {
      const detail = await fetchCompanyStatus(company.companyName)
      setStatus(detail)
      const nextMode =
        currentMode && ((currentMode === "REGULAR" && detail?.regularTimelines?.length) || (currentMode === "INTERN" && detail?.internTimelines?.length) || (currentMode === "ROLLING" && detail?.rollingSteps?.length))
          ? currentMode
          : detail?.regularTimelines?.length
            ? "REGULAR"
            : detail?.internTimelines?.length
              ? "INTERN"
              : detail?.rollingSteps?.length
                ? "ROLLING"
                : null
      setCurrentMode(nextMode)
      if (syncUrl) {
        const currentQ = (searchedQuery || normalizedQuery).trim()
        syncSearchUrl(currentQ || null, company.companyName, nextMode, null)
      }
    } finally {
      setIsStatusLoading(false)
    }

    if (!isDesktop && openSheetOnMobile) setSheetOpen(true)
  }

  useEffect(() => {
    if (restoredFromUrlRef.current) return
    const q = (searchParams?.get("q") ?? "").trim()
    const company = (searchParams?.get("company") ?? "").trim()
    const mode = fromModeSlug(searchParams?.get("mode"))
    const step = (searchParams?.get("step") ?? "").trim()
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
      setCurrentMode(mode)
      setCurrentStep(step || null)
      if (company) {
        await handleSelectCompany({ companyName: company, lastResultAt: null }, false, false)
        if (step) {
          setKeyword(step)
          setLastLeadTimeKeyword("")
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleAddCompany = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newCompanyName.trim()) return
    setIsAddingCompany(true)
    setAddCompanyMessage(null)
    try {
      const result = await createCompany(newCompanyName)
      if (result.pending) {
        const message = result.message ?? "회사 등록 요청 감사합니다. 처리에는 일정 시간이 소요될 수 있습니다."
        setAddCompanyMessage(null)
        setShowRelatedSuggestions(false)
        setCompanyRequestPopupMessage(message)
        setIsCompanyRequestPopupOpen(true)
      } else if (!result.created) {
        setAddCompanyMessage(result.message ?? "해당 회사명은 이미 등록되어 있습니다.")
      } else {
        const normalizedNotice = result.normalizedChanged
          ? `입력값이 정규화되어 "${result.companyName}" 이름으로 저장되었습니다.`
          : null
        setAddCompanyMessage(`회사 추가가 완료되었습니다.${normalizedNotice ? ` ${normalizedNotice}` : ""}`)
      }
      setQuery(result.companyName)
      setShowRelatedSuggestions(true)
    } catch (error) {
      const text = error instanceof Error ? error.message : "회사 추가에 실패했습니다."
      setAddCompanyMessage(text)
    } finally {
      setIsAddingCompany(false)
    }
  }

  const openGlobalReport = (
    companyName?: string,
    mode?: "REGULAR" | "ROLLING" | "INTERN",
    options?: { todayAnnouncement?: boolean },
  ) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    params.set("report", "1")
    if (mode) {
      params.set("reportMode", mode)
    } else {
      params.delete("reportMode")
    }
    if (companyName?.trim()) {
      params.set("reportCompany", companyName.trim())
    } else {
      params.delete("reportCompany")
    }
    const todayAnnouncement = Boolean(options?.todayAnnouncement)
    params.set("reportToday", todayAnnouncement ? "1" : "0")
    params.set("reportNotify", todayAnnouncement ? "1" : "0")
    const qs = params.toString()
    router.replace(`${pathname ?? "/search"}${qs ? `?${qs}` : ""}`)

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open_report_modal", {
          detail: {
            companyName: companyName?.trim() || undefined,
            mode,
            todayAnnouncement,
          },
        }),
      )
    }
  }

  const handleLeadTimeSearch = async (
    e: React.FormEvent,
    keywordOverride?: string,
    modeOverride: "REGULAR" | "INTERN" = "REGULAR",
  ) => {
    e.preventDefault()
    if (!selectedCompany) return

    const trimmed = (keywordOverride ?? keyword).trim()
    if (!trimmed) return

    setIsLeadTimeLoading(true)
    try {
      const result = await fetchCompanyLeadTime(selectedCompany.companyName, trimmed, modeOverride)
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

  // 데스크탑 전환 시 모바일 시트 닫기
  useEffect(() => {
    if (isDesktop) setSheetOpen(false)
  }, [isDesktop])

  return (
    <div className="page-shell [--page-max:1280px] py-4 md:py-8">
      <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>회사 추가하기</DialogTitle>
            <DialogDescription>공백과 (주), ㈜ 는 제거되어 정규화된 이름으로 저장됩니다.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddCompany}>
            <Input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="회사명을 입력해 주세요."
              required
            />
            {newCompanyName.trim() && normalizedAddCompanyPreview && normalizedAddCompanyPreview !== newCompanyName.trim() && (
              <p className="text-xs text-muted-foreground">
                정규화 저장 이름: <span className="font-medium text-foreground">{normalizedAddCompanyPreview}</span>
              </p>
            )}
            {addCompanyMessage && <p className="text-xs text-muted-foreground">{addCompanyMessage}</p>}
            <Button type="submit" disabled={isAddingCompany || !newCompanyName.trim()}>
              {isAddingCompany ? "추가 중..." : "추가하기"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isCompanyRequestPopupOpen} onOpenChange={setIsCompanyRequestPopupOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>회사 등록 요청</AlertDialogTitle>
            <AlertDialogDescription>{companyRequestPopupMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <header className="mb-6 space-y-4 md:hidden">
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/logo.png" alt="언제나와 로고" width={24} height={24} className="rounded-md" priority />
            <span className="text-base font-semibold text-foreground">언제나와</span>
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">회사 검색</h1>
          <p className="text-sm text-muted-foreground">회사명을 검색해서 지원 이력과 전형 타임라인을 확인해 보세요.</p>
        </div>
      </header>

      <section className="relative mb-6 overflow-hidden rounded-[28px] border border-[#dfe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] px-5 pb-5 pt-6 shadow-[0_22px_50px_rgba(97,118,177,0.10)] dark:border-[#31415f] dark:bg-[linear-gradient(180deg,#11172a_0%,#131b31_100%)] dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)] md:px-7 md:pb-7 md:pt-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#4b82ff_0%,#82a7ff_48%,#d4e1ff_100%)] dark:bg-[linear-gradient(90deg,#537ef5_0%,#6d8ef0_48%,#233869_100%)]" />
        <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(76,131,255,0.16)_0%,rgba(76,131,255,0)_72%)] dark:bg-[radial-gradient(circle,rgba(83,126,245,0.2)_0%,rgba(83,126,245,0)_72%)]" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(143,177,255,0.14)_0%,rgba(143,177,255,0)_72%)] dark:bg-[radial-gradient(circle,rgba(76,107,176,0.18)_0%,rgba(76,107,176,0)_72%)]" />
        <div className="relative z-10">
          <div className="flex flex-col gap-5">
            <div className="max-w-[640px]">
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[#6c83bb] dark:text-[#8ea4d8]">SEARCH</p>
              <h1 className="mt-3 text-[30px] font-black tracking-tight text-[#203872] dark:text-[#edf3ff] md:text-[38px]">회사 검색</h1>
              <p className="mt-3 max-w-[560px] text-sm leading-6 text-[#6177af] dark:text-[#9cb0df] md:text-[15px]">
                회사명을 검색해서 저장된 지원 이력, 전형 타임라인, 게시판 흐름을 한 번에 확인하세요.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e4ff] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4966a8] dark:border-[#31415f] dark:bg-[#16203a] dark:text-[#bdd0ff]">
                  <Search className="h-3.5 w-3.5" />
                  회사명 즉시 조회
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e4ff] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4966a8] dark:border-[#31415f] dark:bg-[#16203a] dark:text-[#bdd0ff]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  발표 일정 비교
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e4ff] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4966a8] dark:border-[#31415f] dark:bg-[#16203a] dark:text-[#bdd0ff]">
                  <Sparkles className="h-3.5 w-3.5" />
                  제보 바로 등록
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Area */}
      <section
        className={cn(
          "relative mb-6 rounded-[24px] border border-[#dfe6ff] bg-white/95 p-4 shadow-[0_18px_40px_rgba(97,118,177,0.1)] dark:border-[#31415f] dark:bg-[#121a2d]/95 dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)] md:p-5",
          shouldShowRelatedSuggestions ? "z-20" : "z-0",
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
          <Image src="/design-previews/icon/panel-shape.png" alt="" fill className="object-cover opacity-50" />
        </div>
        <form onSubmit={handleSearch}>
          <div className="relative z-10 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1">
              <Input
                type="search"
                placeholder="회사명을 입력해 주세요."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowRelatedSuggestions(true)
                }}
                onFocus={() => setShowRelatedSuggestions(true)}
                className="h-13 rounded-[18px] border-[#dce4ff] bg-white/94 px-4 shadow-none dark:border-[#344464] dark:bg-[#0f1729] dark:text-[#edf3ff] dark:placeholder:text-[#8293b6]"
              />
              {shouldShowRelatedSuggestions && (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 rounded-[20px] border border-[#dfe6ff] bg-white p-2 shadow-[0_18px_36px_rgba(97,118,177,0.14)] dark:border-[#31415f] dark:bg-[#16213a] dark:shadow-[0_22px_44px_rgba(0,0,0,0.38)]">
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
                        <div className="flex items-center gap-3">
                          <CompanyIcon companyId={company.companyId} companyName={company.companyName} size={34} textClassName="text-xs" />
                          <span>{company.companyName}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
              <button
                type="submit"
                disabled={isSearching || !normalizedQuery}
                className="h-13 shrink-0 whitespace-nowrap rounded-[18px] bg-[linear-gradient(180deg,#4b82ff_0%,#275fe8_100%)] px-6 font-semibold text-primary-foreground shadow-[0_12px_24px_rgba(44,92,221,0.2)] transition-colors hover:opacity-95 disabled:opacity-50"
              >
                {isSearching ? "검색 중..." : "검색"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-12 w-full rounded-[18px] border-[#dce4ff] bg-white dark:border-[#31415f] dark:bg-[#16213a] sm:w-auto" onClick={() => setIsAddCompanyOpen(true)}>
                회사 추가하기
              </Button>
              {selectedCompany && (
                <Link href={`/board/${toCompanySlug(selectedCompany.companyName)}`} className="w-full sm:w-auto">
                  <Button type="button" variant="outline" className="h-12 w-full rounded-[18px] border-[#dce4ff] bg-white dark:border-[#31415f] dark:bg-[#16213a] sm:w-auto">게시판 가기</Button>
                </Link>
              )}
            </div>
          </div>
          {!shouldShowRelatedSuggestions && (
            <div className="relative z-10 mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f5ff] px-3 py-1 text-[#6177af] dark:bg-[#16213a] dark:text-[#a8baea]">
                <Building2 className="h-3.5 w-3.5" />
                회사명으로 검색하고 상세 타임라인을 확인할 수 있습니다.
              </span>
            </div>
          )}
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
                      <div className="flex min-w-0 items-center gap-3">
                        <CompanyIcon companyId={company.companyId} companyName={company.companyName} size={42} />
                        <h3 className="min-w-0 truncate font-semibold text-foreground">{company.companyName}</h3>
                      </div>
                      <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                        선택
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">선택하면 이 화면에서 타임라인과 채팅을 확인합니다.</p>
                    <div className="mt-2">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/board/${toCompanySlug(company.companyName)}/summary`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          정보 요약
                        </Link>
                        <Link
                          href={`/board/${toCompanySlug(company.companyName)}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          게시판
                        </Link>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedCompany && (
                <CompanyChatRoom
                  companyId={status?.companyId ?? null}
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
              status={status}
              leadTime={leadTime}
              keyword={keyword}
              lastLeadTimeKeyword={lastLeadTimeKeyword}
              onKeywordChange={handleKeywordChange}
              onKeywordSearch={handleLeadTimeSearch}
              selectedCalendarDate={selectedCalendarDate}
              onCalendarDateSelect={handleCalendarDateSelect}
              isCalendarVisible={isCalendarVisible}
              isStatusLoading={isStatusLoading}
              isLeadTimeLoading={isLeadTimeLoading}
              onInterviewReviewSelect={setSelectedInterviewReview}
              onActiveModeChange={(mode) => {
                if (mode === currentMode) return
                setCurrentMode(mode)
                const currentQ = (searchedQuery || normalizedQuery).trim()
                syncSearchUrl(currentQ || null, selectedCompany?.companyName ?? null, mode, null)
              }}
              onSelectedStepChange={(stepName) => {
                if ((stepName ?? null) === (currentStep ?? null)) return
                setCurrentStep(stepName)
                const currentQ = (searchedQuery || normalizedQuery).trim()
                syncSearchUrl(currentQ || null, selectedCompany?.companyName ?? null, currentMode ?? null, stepName)
              }}
              initialMode={currentMode ?? undefined}
              initialStep={currentStep ?? undefined}
              onQuickReport={(companyName, mode, options) =>
                openGlobalReport(companyName, mode, {
                  todayAnnouncement: Boolean(options?.todayAnnouncement),
                })
              }
              className="h-full"
            />
            </div>
          </div>
        )}
      </section>

      {/* Mobile: Bottom Sheet */}
      <CompanyDetailSheet
        company={selectedCompany}
        status={status}
        leadTime={leadTime}
        keyword={keyword}
        lastLeadTimeKeyword={lastLeadTimeKeyword}
        onKeywordChange={handleKeywordChange}
        onKeywordSearch={handleLeadTimeSearch}
        selectedCalendarDate={selectedCalendarDate}
        onCalendarDateSelect={handleCalendarDateSelect}
        isCalendarVisible={isCalendarVisible}
        isStatusLoading={isStatusLoading}
        isLeadTimeLoading={isLeadTimeLoading}
        onInterviewReviewSelect={setSelectedInterviewReview}
        onActiveModeChange={(mode) => {
          if (mode === currentMode) return
          setCurrentMode(mode)
          const currentQ = (searchedQuery || normalizedQuery).trim()
          syncSearchUrl(currentQ || null, selectedCompany?.companyName ?? null, mode, null)
        }}
        onSelectedStepChange={(stepName) => {
          if ((stepName ?? null) === (currentStep ?? null)) return
          setCurrentStep(stepName)
          const currentQ = (searchedQuery || normalizedQuery).trim()
          syncSearchUrl(currentQ || null, selectedCompany?.companyName ?? null, currentMode ?? null, stepName)
        }}
        initialMode={currentMode ?? undefined}
        initialStep={currentStep ?? undefined}
        onQuickReport={(companyName, mode, options) =>
          openGlobalReport(companyName, mode, {
            todayAnnouncement: Boolean(options?.todayAnnouncement),
          })
        }
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <Dialog open={selectedInterviewReview != null} onOpenChange={(open) => !open && setSelectedInterviewReview(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl !overflow-hidden border-[#d8e2fb] bg-white shadow-[0_20px_60px_rgba(98,120,177,0.18)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {selectedInterviewReview && (
            <div className="flex max-h-[calc(85vh-2rem)] flex-col gap-3 overflow-hidden">
              <DialogHeader>
                <div className="mb-1 flex items-center justify-between gap-2 pr-8 text-xs text-[#6f83b3]">
                  <span className="inline-flex items-center rounded-md border border-[#d7e3ff] bg-[#f5f8ff] px-2 py-0.5 font-medium text-[#4f6fb1]">
                    {selectedInterviewReview.stepName}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-[#d7e3ff] bg-[#f5f8ff] px-2 py-0.5 font-medium text-[#4f6fb1]">
                    {selectedInterviewReview.difficulty === "HARD" ? "어려움" : selectedInterviewReview.difficulty === "EASY" ? "쉬움" : "보통"}
                  </span>
                </div>
                <DialogTitle className="text-left text-base text-foreground">면접 후기 상세</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="nawa-scrollbar h-full overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="rounded-xl border border-[#d8e2fb] bg-[#fbfcff] px-4 py-4 text-sm leading-7 text-foreground whitespace-pre-wrap break-words shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)]">
                    {selectedInterviewReview.content}
                  </div>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {selectedInterviewReview.createdAt.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-6 text-sm text-muted-foreground">불러오는 중...</div>}>
      <SearchPageClient />
    </Suspense>
  )
}

