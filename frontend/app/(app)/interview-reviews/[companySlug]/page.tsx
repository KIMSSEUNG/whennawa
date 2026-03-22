"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { fromCompanySlug } from "@/lib/company-slug"
import { fetchInterviewReviewSteps, fetchInterviewReviews, likeInterviewReview } from "@/lib/api"
import type { InterviewReview, InterviewReviewSort, RecruitmentMode } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const formatDifficultyLabel = (difficulty: InterviewReview["difficulty"]) => {
  if (difficulty === "HARD") return "어려움"
  if (difficulty === "EASY") return "쉬움"
  return "보통"
}

const getModeLabel = (mode: RecruitmentMode) => {
  if (mode === "REGULAR") return "공채"
  if (mode === "INTERN") return "인턴"
  return "수시"
}

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
  const [selectedReview, setSelectedReview] = useState<InterviewReview | null>(null)
  const [pendingLikeReviewIds, setPendingLikeReviewIds] = useState<number[]>([])

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
    void loadSteps()
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
    void load()
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
    setSelectedReview(null)
    setPendingLikeReviewIds([])
  }, [mode])

  const toggleLike = async (review: InterviewReview) => {
    if (pendingLikeReviewIds.includes(review.reviewId)) return

    const currentReview =
      items.find((item) => item.reviewId === review.reviewId) ??
      (selectedReview?.reviewId === review.reviewId ? selectedReview : review)
    if (!currentReview) return

    setPendingLikeReviewIds((prev) => [...prev, review.reviewId])
    try {
      const updated = await likeInterviewReview(review.reviewId)
      setItems((prev) => prev.map((item) => (item.reviewId === updated.reviewId ? updated : item)))
      setSelectedReview((prev) => (prev?.reviewId === updated.reviewId ? updated : prev))
    } finally {
      setPendingLikeReviewIds((prev) => prev.filter((id) => id !== review.reviewId))
    }
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

  const seoSummaryLines = useMemo(() => {
    const lines = [`${companyName} ${getModeLabel(mode)} 면접 후기 페이지입니다.`]

    if (selectedStepName.trim()) {
      lines.push(`${selectedStepName.trim()} 단계와 관련된 면접 후기를 중심으로 보고 있습니다.`)
    }

    if (items.length > 0) {
      lines.push(`현재 화면에는 ${items.length}개의 면접 후기가 표시되고 있으며, 실제 등록된 후기 내용을 기반으로 확인할 수 있습니다.`)
    }

    return lines
  }, [companyName, items.length, mode, selectedStepName])

  return (
    <>
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
              className="h-11 border-[#d8e2fb] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.95)]"
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
            <SelectTrigger className="w-40 border-[#d8e2fb] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.95)]">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LIKES">좋아요 순</SelectItem>
              <SelectItem value="LATEST">최신 순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <section className="space-y-3">
          {items.map((item) => {
            const expandable = shouldShowExpand(item.content)
            const isLikePending = pendingLikeReviewIds.includes(item.reviewId)
            return (
              <article
                key={`review-${item.reviewId}`}
                className="cursor-pointer rounded-xl border border-[#d8e2fb] bg-card p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)] transition-colors hover:bg-[#fbfcff]"
                onClick={() => setSelectedReview(item)}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.stepName}</span>
                  <span>{formatDifficultyLabel(item.difficulty)}</span>
                </div>
                <p className={`break-words text-sm text-foreground ${expandable ? "line-clamp-1" : ""}`}>{item.content}</p>
                {expandable && <span className="mt-1 inline-block text-xs text-primary">자세히 보기</span>}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {item.createdAt.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-w-[5.5rem] px-3"
                    disabled={isLikePending}
                    onClick={(event) => {
                      event.stopPropagation()
                      void toggleLike(item)
                    }}
                  >
                    {isLikePending ? "처리 중..." : `좋아요 ${item.likeCount}`}
                  </Button>
                </div>
              </article>
            )
          })}
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

        <section className="mt-6 rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">면접 후기 참고 정보</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-foreground/85">
            {seoSummaryLines.map((line) => (
              <p key={`review-seo-${line}`}>{line}</p>
            ))}
          </div>
        </section>
      </main>

      <Dialog open={selectedReview != null} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl !overflow-hidden border-[#d8e2fb] bg-white shadow-[0_20px_60px_rgba(98,120,177,0.18)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {selectedReview && (
            <div className="flex max-h-[calc(85vh-2rem)] flex-col gap-3 overflow-hidden">
              <DialogHeader>
                <div className="mb-1 flex items-center justify-between gap-2 pr-8 text-xs text-[#6f83b3]">
                  <span className="inline-flex items-center rounded-md border border-[#d7e3ff] bg-[#f5f8ff] px-2 py-0.5 font-medium text-[#4f6fb1]">
                    {selectedReview.stepName}
                  </span>
                  <span className="inline-flex items-center rounded-md border border-[#d7e3ff] bg-[#f5f8ff] px-2 py-0.5 font-medium text-[#4f6fb1]">
                    {formatDifficultyLabel(selectedReview.difficulty)}
                  </span>
                </div>
                <DialogTitle className="text-left text-base text-foreground">면접 후기 상세</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="nawa-scrollbar h-full overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="rounded-xl border border-[#d8e2fb] bg-[#fbfcff] px-4 py-4 text-sm leading-7 text-foreground whitespace-pre-wrap break-words shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)]">
                    {selectedReview.content}
                  </div>
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {selectedReview.createdAt.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-[5.5rem] px-3"
                  disabled={pendingLikeReviewIds.includes(selectedReview.reviewId)}
                  onClick={() => void toggleLike(selectedReview)}
                >
                  {pendingLikeReviewIds.includes(selectedReview.reviewId)
                    ? "처리 중..."
                    : `좋아요 ${selectedReview.likeCount}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
