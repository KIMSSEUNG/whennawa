"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { searchCompanies, createCompany } from "@/lib/api"
import { normalizeCompanyName } from "@/lib/company-name"
import type { CompanySearchItem } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/empty-state"
import { toCompanySlug } from "@/lib/company-slug"

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

  const normalizedQuery = useMemo(() => query.trim(), [query])
  const normalizedPreview = useMemo(() => normalizeCompanyName(newCompanyName), [newCompanyName])
  const exactMatch = useMemo(() => {
    if (!normalizedQuery) return false
    return relatedResults.some((company) => company.companyName?.toLowerCase() === normalizedQuery.toLowerCase())
  }, [relatedResults, normalizedQuery])

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
      if (!result.created) {
        setAddMessage("해당 회사명은 이미 등록되어 있습니다.")
      } else {
        const normalizedNotice = result.normalizedChanged
          ? `입력값이 정규화되어 "${result.companyName}" 이름으로 저장되었습니다.`
          : null
        setAddMessage(`회사 추가가 완료되었습니다.${normalizedNotice ? ` ${normalizedNotice}` : ""}`)
      }
      setQuery(result.companyName)
      await runSearch(result.companyName)
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
    <div className="container mx-auto max-w-[1200px] space-y-6 px-4 py-6">
      <section className="relative overflow-visible rounded-3xl border border-border/60 bg-card p-5 md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(80,120,255,0.2),transparent_55%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Community Board</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">회사 게시판 찾기</h1>
          <p className="mt-1 text-sm text-muted-foreground">회사명을 검색해서 게시판으로 바로 이동하고, 필요한 경우 새 회사를 등록할 수 있습니다.</p>

          <form
            className="mt-5 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void runSearch()
            }}
          >
            <div className="relative min-w-[240px] flex-1">
              <Input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowRelatedSuggestions(true)
                }}
                onFocus={() => setShowRelatedSuggestions(true)}
                placeholder="회사명을 입력해 주세요"
                className="h-12 rounded-xl border-border/70 bg-background/80"
              />
              {showRelatedSuggestions && normalizedQuery && relatedResults.length > 0 && !exactMatch && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] rounded-2xl border border-border/70 bg-card p-2 shadow-lg">
                  <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">연관 검색어</p>
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
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent/60"
                      >
                        {company.companyName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button type="submit" className="h-12 px-6" disabled={isSearching || !query.trim()}>
              {isSearching ? "검색 중..." : "게시판 검색"}
            </Button>
            <Button type="button" variant="outline" className="h-12 px-6" onClick={() => setIsAddOpen(true)}>
              회사 추가
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {!!searched && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300">
                최근 검색: {searched}
              </span>
            )}
          </div>
        </div>
      </section>

      {isSearching ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">검색 중입니다...</div>
      ) : !searched ? (
        <EmptyState title="회사 게시판 검색" description="회사명을 검색하면 해당 회사 게시판으로 이동할 수 있습니다." />
      ) : results.length === 0 ? (
        <EmptyState title="검색 결과 없음" description={`"${searched}"에 해당하는 회사를 찾지 못했습니다.`} />
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {results.map((company) => (
            <button
              key={company.companyName}
              type="button"
              onClick={() => router.push(`/board/${toCompanySlug(company.companyName)}`)}
              className="group rounded-2xl border border-border/60 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-semibold text-foreground">{company.companyName}</p>
                <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  입장
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">게시글 확인, 검색, 작성 페이지 이동</p>
              <p className="mt-3 text-[11px] text-muted-foreground/80 group-hover:text-muted-foreground">클릭하면 회사 게시판으로 이동합니다.</p>
            </button>
          ))}
        </section>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회사 추가하기</DialogTitle>
            <DialogDescription>공백과 (주), ㈜ 는 제거되어 정규화된 이름으로 저장됩니다.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddCompany}>
            <Input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="회사명을 입력해 주세요"
              required
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
    </div>
  )
}
