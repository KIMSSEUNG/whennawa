"use client"

import type React from "react"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  searchCompanies,
  fetchCompanyTimeline,
  fetchCompanyLeadTime,
  createCompany,
  getUser,
  logout,
} from "@/lib/api"
import type {
  CompanySearchItem,
  CompanyTimeline,
  KeywordLeadTime,
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
      const qs = searchParams?.toString()
      const nextPath = `${pathname ?? "/"}${qs ? `?${qs}` : ""}`
      router.push(`/login?next=${encodeURIComponent(nextPath)}`)
    } finally {
      setIsLoggingOut(false)
    }
  }
  const loginHref = `/login?next=${encodeURIComponent(`${pathname ?? "/"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`)}`

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
    mode?: "REGULAR" | "ROLLING",
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
    <div className="container mx-auto max-w-[1400px] px-4 py-6">
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

      {/* Header - mobile only */}
      <header className="mb-6 flex items-start justify-between md:hidden">
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="/logo.png" alt="언제나와 로고" width={24} height={24} className="rounded-md" priority />
            <span className="text-base font-semibold text-foreground">언제나와</span>
          </Link>
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
              href={loginHref}
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
          <div className="flex flex-wrap gap-2">
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
              {showRelatedSuggestions && !isCompanyRequestPopupOpen && normalizedQuery && relatedResults.length > 0 && !exactMatch && (
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
            <Button type="button" variant="outline" className="h-12" onClick={() => setIsAddCompanyOpen(true)}>
              회사 추가하기
            </Button>
            {selectedCompany && (
              <Link href={`/board/${toCompanySlug(selectedCompany.companyName)}`}>
                <Button type="button" variant="outline" className="h-12">게시판 가기</Button>
              </Link>
            )}
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
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/company/${toCompanySlug(company.companyName)}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          공개 페이지
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
        onQuickReport={(companyName, mode, options) =>
          openGlobalReport(companyName, mode, {
            todayAnnouncement: Boolean(options?.todayAnnouncement),
          })
        }
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
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
