"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createCompany, searchCompanies } from "@/lib/api"
import { normalizeCompanyName } from "@/lib/company-name"
import { toCompanySlug } from "@/lib/company-slug"
import { EmptyState } from "@/components/empty-state"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { boardTheme } from "@/lib/board-theme"
import type { CompanySearchItem } from "@/lib/types"

export default function BoardPage() {
  const router = useRouter()

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CompanySearchItem[]>([])
  const [relatedResults, setRelatedResults] = useState<CompanySearchItem[]>([])
  const [showRelatedSuggestions, setShowRelatedSuggestions] = useState(true)
  const [searched, setSearched] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [addMessage, setAddMessage] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isCompanyRequestPopupOpen, setIsCompanyRequestPopupOpen] = useState(false)
  const [companyRequestPopupMessage, setCompanyRequestPopupMessage] = useState("")

  const normalizedQuery = useMemo(() => query.trim(), [query])
  const normalizedPreview = useMemo(() => normalizeCompanyName(newCompanyName), [newCompanyName])
  const exactMatch = useMemo(() => {
    if (!normalizedQuery) return false
    return relatedResults.some((company) => company.companyName?.toLowerCase() === normalizedQuery.toLowerCase())
  }, [relatedResults, normalizedQuery])
  const shouldShowRelatedSuggestions =
    showRelatedSuggestions && !isCompanyRequestPopupOpen && Boolean(normalizedQuery) && relatedResults.length > 0 && !exactMatch

  const runSearch = async (queryOverride?: string) => {
    const trimmed = (queryOverride ?? query).trim()
    if (!trimmed) return

    setIsSearching(true)
    setSearched(trimmed)
    setShowRelatedSuggestions(false)
    try {
      const data = await searchCompanies(trimmed)
      setResults(data ?? [])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddCompany = async (event: FormEvent) => {
    event.preventDefault()
    if (!newCompanyName.trim()) return

    setIsAdding(true)
    setAddMessage(null)
    try {
      const result = await createCompany(newCompanyName)
      if (result.pending) {
        const message = result.message ?? "회사 등록 요청 감사합니다. 처리에는 일정 시간이 소요될 수 있습니다."
        setAddMessage(null)
        setShowRelatedSuggestions(false)
        setCompanyRequestPopupMessage(message)
        setIsCompanyRequestPopupOpen(true)
      } else if (!result.created) {
        setAddMessage(result.message ?? "해당 회사명은 이미 등록되어 있습니다.")
      } else {
        const normalizedNotice = result.normalizedChanged
          ? `입력값이 정규화되어 "${result.companyName}" 이름으로 저장되었습니다.`
          : null
        setAddMessage(`회사 추가가 완료되었습니다.${normalizedNotice ? ` ${normalizedNotice}` : ""}`)
      }

      setQuery(result.companyName)
      if (!result.pending) await runSearch(result.companyName)
    } catch (error) {
      const message = error instanceof Error ? error.message : "회사 추가에 실패했습니다."
      setAddMessage(message)
    } finally {
      setIsAdding(false)
    }
  }

  useEffect(() => {
    if (!normalizedQuery) {
      setRelatedResults([])
      return
    }

    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await searchCompanies(normalizedQuery, 6)
      if (cancelled) return
      setRelatedResults(data ?? [])
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [normalizedQuery])

  return (
    <div className="page-shell [--page-max:1280px] space-y-6 py-6">
      <section className={boardTheme.heroSection}>
        <div className={boardTheme.heroTopLine} />
        <div className={boardTheme.heroGlowRight} />
        <div className={boardTheme.heroGlowLeft} />
        <div className="relative">
          <p className={boardTheme.heroEyebrow}>Community Board</p>
          <h1 className={boardTheme.heroTitle}>회사 게시판 찾기</h1>
          <p className={boardTheme.heroDescription}>
            회사명을 검색해 게시판으로 이동하고, 없으면 회사 추가 요청까지 바로 보낼 수 있습니다.
          </p>

          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
            onSubmit={(event) => {
              event.preventDefault()
              void runSearch()
            }}
          >
            <div className="relative min-w-0 flex-[1.55]">
              <Input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setShowRelatedSuggestions(true)
                }}
                onFocus={() => setShowRelatedSuggestions(true)}
                placeholder="회사명을 입력해 주세요."
                className={`h-12 rounded-[18px] bg-white shadow-none dark:bg-[#0f1726] ${boardTheme.field}`}
              />
              {shouldShowRelatedSuggestions && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] rounded-2xl border border-[#dbe3f7] bg-white p-2 shadow-lg dark:border-[#365168] dark:bg-[#15273a] dark:shadow-[0_22px_44px_rgba(0,0,0,0.38)]">
                  <p className="px-2 pb-1 text-xs font-medium text-[#7586b3]">연관 검색어</p>
                  <div className="max-h-64 overflow-auto">
                    {relatedResults.map((company) => (
                      <button
                        key={`related-${company.companyName}`}
                        type="button"
                        onClick={() => {
                          setQuery(company.companyName)
                          setShowRelatedSuggestions(false)
                          void runSearch(company.companyName)
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-[#f5f8ff] dark:hover:bg-[#1b3045]"
                      >
                        {company.companyName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              type="submit"
              className={`h-12 w-full flex-[0.82] rounded-[18px] ${boardTheme.solidButton} sm:w-auto`}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? "검색 중..." : "게시판 검색"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`h-12 w-full flex-[0.72] rounded-[18px] ${boardTheme.outlineButton} sm:w-auto`}
              onClick={() => setIsAddOpen(true)}
            >
              회사 추가
            </Button>
          </form>

          {!shouldShowRelatedSuggestions && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {!!searched && <span className={boardTheme.messageChip}>최근 검색: {searched}</span>}
            </div>
          )}
        </div>
      </section>

      {isSearching ? (
        <div className={`${boardTheme.card} p-8 text-sm ${boardTheme.metaText}`}>검색 중입니다...</div>
      ) : !searched ? (
        <EmptyState
          title="회사 게시판 검색"
          description="회사명을 검색하면 해당 회사 게시판으로 바로 이동할 수 있습니다."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="검색 결과 없음"
          description={`"${searched}"에 해당하는 회사를 찾지 못했어요.`}
        />
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {results.map((company) => (
            <button
              key={company.companyName}
              type="button"
              onClick={() => router.push(`/board/${toCompanySlug(company.companyName)}`)}
              className={`group ${boardTheme.card} p-4 text-left ${boardTheme.hoverCard}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className={`text-base font-semibold ${boardTheme.titleText}`}>{company.companyName}</p>
                <span className={`shrink-0 font-medium ${boardTheme.tag}`}>입장</span>
              </div>
              <p className={`mt-2 text-xs ${boardTheme.metaText}`}>게시글 확인과 글 작성 화면으로 바로 이동합니다.</p>
              <p className="mt-3 text-[11px] text-[#6b7280] group-hover:text-[#4b5563] dark:text-[#8c9cae] dark:group-hover:text-[#c9d6e3]">
                카드를 누르면 회사 게시판으로 이동합니다.
              </p>
            </button>
          ))}
        </section>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회사 추가하기</DialogTitle>
            <DialogDescription>공백과 (주), ㈜ 표기는 제거되어 정규화된 이름으로 저장됩니다.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddCompany}>
            <Input
              value={newCompanyName}
              onChange={(event) => setNewCompanyName(event.target.value)}
              placeholder="회사명을 입력해 주세요."
              required
              className={boardTheme.field}
            />
            {newCompanyName.trim() && normalizedPreview && normalizedPreview !== newCompanyName.trim() && (
              <p className="text-xs text-muted-foreground">
                정규화 저장 이름: <span className="font-medium text-foreground">{normalizedPreview}</span>
              </p>
            )}
            {addMessage && <p className="text-xs text-muted-foreground">{addMessage}</p>}
            <Button type="submit" disabled={isAdding || !newCompanyName.trim()}>
              {isAdding ? "추가 중..." : "추가하기"}
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
    </div>
  )
}
