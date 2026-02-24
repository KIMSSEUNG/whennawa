"use client"

import { useMemo, useState } from "react"
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
  const [searched, setSearched] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [addMessage, setAddMessage] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const normalizedPreview = useMemo(() => normalizeCompanyName(newCompanyName), [newCompanyName])

  const runSearch = async (queryOverride?: string) => {
    const trimmed = (queryOverride ?? query).trim()
    if (!trimmed) return
    setIsSearching(true)
    setSearched(trimmed)
    try {
      const data = await searchCompanies(trimmed)
      setResults(data ?? [])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddCompany = async (event: React.FormEvent) => {
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

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-6">
      <section className="mb-6 rounded-2xl border border-border/60 bg-card p-4">
        <h1 className="text-2xl font-bold text-foreground">취업 게시판</h1>
        <p className="mt-1 text-sm text-muted-foreground">회사명을 검색해 해당 회사 게시판에 들어가서 이야기를 남겨보세요.</p>

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void runSearch()
          }}
        >
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="회사명을 입력해 주세요."
            className="h-11 flex-1 min-w-[240px]"
          />
          <Button type="submit" className="h-11 px-5" disabled={isSearching || !query.trim()}>
            {isSearching ? "검색 중..." : "검색"}
          </Button>
          <Button type="button" variant="outline" className="h-11 px-5" onClick={() => setIsAddOpen(true)}>
            회사 추가하기
          </Button>
        </form>
      </section>

      {isSearching ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">검색 중...</div>
      ) : !searched ? (
        <EmptyState title="회사 게시판 검색" description="회사명을 검색하면 해당 회사 게시판으로 이동할 수 있습니다." />
      ) : results.length === 0 ? (
        <EmptyState title="검색 결과 없음" description={`"${searched}"에 해당하는 회사를 찾지 못했습니다.`} />
      ) : (
        <section className="space-y-3">
          {results.map((company) => (
            <button
              key={company.companyName}
              type="button"
              onClick={() => router.push(`/board/${toCompanySlug(company.companyName)}`)}
              className="w-full rounded-2xl border border-border/60 bg-card p-4 text-left transition-colors hover:bg-accent/40"
            >
              <p className="text-base font-semibold text-foreground">{company.companyName}</p>
              <p className="mt-1 text-xs text-muted-foreground">게시판 입장하기</p>
            </button>
          ))}
        </section>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회사 추가하기</DialogTitle>
            <DialogDescription>공백과 (주), ㈜ 는 제거되어 저장됩니다.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddCompany}>
            <Input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="회사명을 입력해 주세요."
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
