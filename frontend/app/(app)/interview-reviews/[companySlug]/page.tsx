"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { fromCompanySlug } from "@/lib/company-slug"
import { fetchInterviewReviewSteps, fetchInterviewReviews, likeInterviewReview, unlikeInterviewReview } from "@/lib/api"
import type { InterviewReview, InterviewReviewSort, RecruitmentMode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function InterviewReviewsPage() {
  const params = useParams<{ companySlug: string }>()
  const companySlug = params?.companySlug ?? ""
  const companyName = useMemo(() => fromCompanySlug(companySlug), [companySlug])
  const [items, setItems] = useState<InterviewReview[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sort, setSort] = useState<InterviewReviewSort>("LIKES")
  const [mode, setMode] = useState<RecruitmentMode>("REGULAR")
  const [stepNames, setStepNames] = useState<string[]>([])
  const [stepQuery, setStepQuery] = useState("")
  const [selectedStepName, setSelectedStepName] = useState("")
  const [showStepSuggestions, setShowStepSuggestions] = useState(false)
  const [expandedReviewIds, setExpandedReviewIds] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    const loadSteps = async () => {
      const data = await fetchInterviewReviewSteps(companyName, mode).catch(() => [])
      if (cancelled) return
      setStepNames(data)
      setStepQuery("")
      setSelectedStepName("")
      setShowStepSuggestions(false)
    }
    loadSteps()
    return () => {
      cancelled = true
    }
  }, [companyName, mode])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const data = await fetchInterviewReviews(companyName, 0, 20, sort, selectedStepName || undefined, mode)
        if (cancelled) return
        const modeFiltered = (data.items ?? []).filter((item) => item.recruitmentMode === mode)
        setItems(modeFiltered)
        setPage(data.page)
        setHasNext(data.hasNext)
      } catch {
        if (cancelled) return
        setItems([])
        setPage(0)
        setHasNext(false)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [companyName, sort, selectedStepName, mode])

  const loadMore = async () => {
    if (!hasNext || isLoading) return
    setIsLoading(true)
    try {
      const data = await fetchInterviewReviews(companyName, page + 1, 20, sort, selectedStepName || undefined, mode)
      const modeFiltered = (data.items ?? []).filter((item) => item.recruitmentMode === mode)
      setItems((prev) => [...prev, ...modeFiltered])
      setPage(data.page)
      setHasNext(data.hasNext)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setItems([])
    setPage(0)
    setHasNext(false)
    setExpandedReviewIds([])
  }, [mode])

  const toggleLike = async (review: InterviewReview) => {
    const updated = review.likedByMe
      ? await unlikeInterviewReview(review.reviewId).catch(() => null)
      : await likeInterviewReview(review.reviewId).catch(() => null)
    if (!updated) return
    setItems((prev) => prev.map((item) => (item.reviewId === updated.reviewId ? updated : item)))
  }

  const toggleReviewExpanded = (reviewId: number) => {
    setExpandedReviewIds((prev) =>
      prev.includes(reviewId) ? prev.filter((id) => id !== reviewId) : [...prev, reviewId],
    )
  }

  const shouldShowExpand = (content: string) => {
    const normalized = content.trim()
    return normalized.length > 70 || normalized.includes("\n")
  }

  const filteredStepSuggestions = useMemo(() => {
    const query = stepQuery.trim().toLowerCase()
    if (!query) return stepNames.slice(0, 8)
    return stepNames.filter((name) => name.toLowerCase().includes(query)).slice(0, 8)
  }, [stepNames, stepQuery])

  const applyStepFilter = (stepName: string) => {
    const value = stepName.trim()
    setSelectedStepName(value)
    setStepQuery(value)
    setShowStepSuggestions(false)
  }

  const clearStepFilter = () => {
    setSelectedStepName("")
    setStepQuery("")
    setShowStepSuggestions(false)
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{companyName} 면접 후기</h1>
        <Link href={`/search?company=${encodeURIComponent(companyName)}`} className="text-sm text-primary hover:underline">
          검색으로 돌아가기
        </Link>
      </div>

      <div className="mb-4 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("REGULAR")}
            className={`h-9 rounded-full border px-3 text-sm transition-colors ${
              mode === "REGULAR"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40"
            }`}
          >
            공채
          </button>
          <button
            type="button"
            onClick={() => setMode("INTERN")}
            className={`h-9 rounded-full border px-3 text-sm transition-colors ${
              mode === "INTERN"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40"
            }`}
          >
            인턴
          </button>
          <button
            type="button"
            onClick={() => setMode("ROLLING")}
            className={`h-9 rounded-full border px-3 text-sm transition-colors ${
              mode === "ROLLING"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40"
            }`}
          >
            수시
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Input
            value={stepQuery}
            onChange={(e) => {
              setStepQuery(e.target.value)
              setShowStepSuggestions(true)
            }}
            onFocus={() => setShowStepSuggestions(true)}
            onBlur={() => setTimeout(() => setShowStepSuggestions(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                const exact = stepNames.find((name) => name === stepQuery.trim())
                if (exact) {
                  applyStepFilter(exact)
                }
              }
            }}
            placeholder="전형명을 입력해 주세요."
            className="h-11"
          />
          {showStepSuggestions && filteredStepSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-border/60 bg-card p-1.5 shadow-lg">
              <div className="max-h-52 overflow-auto">
                {filteredStepSuggestions.map((stepName) => (
                  <button
                    key={`step-suggestion-${stepName}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyStepFilter(stepName)}
                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent/60"
                  >
                    {stepName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={clearStepFilter}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            전체 보기
          </button>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <Select value={sort} onValueChange={(value) => setSort(value as InterviewReviewSort)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LIKES">좋아요 순</SelectItem>
            <SelectItem value="LATEST">최신 순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <section className="space-y-3">
        {items.map((item) => (
          <article key={`review-${item.reviewId}`} className="rounded-xl border border-border/60 bg-card p-4">
            {(() => {
              const expandable = shouldShowExpand(item.content)
              const expanded = expandedReviewIds.includes(item.reviewId)
              return (
                <>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{item.stepName}</span>
              <span>{item.difficulty === "HARD" ? "어려움" : item.difficulty === "EASY" ? "쉬움" : "보통"}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!expandable) return
                toggleReviewExpanded(item.reviewId)
              }}
              className={`w-full text-left ${expandable ? "cursor-pointer" : "cursor-default"}`}
            >
              <p className={`text-sm text-foreground ${expanded ? "whitespace-pre-wrap" : "line-clamp-1"}`}>
                {item.content}
              </p>
              {expandable && (
                <span className="mt-1 inline-block text-xs text-primary">
                  {expanded ? "접기" : "더보기"}
                </span>
              )}
            </button>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {item.createdAt.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => toggleLike(item)}>
                좋아요 {item.likeCount}
              </Button>
            </div>
                </>
              )
            })()}
          </article>
        ))}
      </section>

      {items.length === 0 && !isLoading && (
        <p className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          등록된 면접 후기가 없습니다.
        </p>
      )}

      {hasNext && (
        <div className="mt-5 flex justify-center">
          <Button type="button" variant="outline" onClick={loadMore} disabled={isLoading}>
            {isLoading ? "불러오는 중..." : "더보기"}
          </Button>
        </div>
      )}
    </main>
  )
}
