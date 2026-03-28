"use client"

import type { MouseEventHandler } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { AlertTriangle, Circle, Leaf, ThumbsUp } from "lucide-react"
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

const getDifficultyTone = (difficulty: InterviewReview["difficulty"]) => {
  if (difficulty === "HARD") {
    return {
      label: "어려움",
      className: "border-[#ff9b9b] bg-[#fff3f3] text-[#d14343]",
      Icon: AlertTriangle,
    }
  }
  if (difficulty === "EASY") {
    return {
      label: "쉬움",
      className: "border-[#7fd3a0] bg-[#effcf4] text-[#1f9d57]",
      Icon: Leaf,
    }
  }
  return {
    label: "보통",
    className: "border-[#f2cb63] bg-[#fff9e8] text-[#c58a00]",
    Icon: Circle,
  }
}

const getModeLabel = (mode: RecruitmentMode) => {
  if (mode === "REGULAR") return "공채"
  if (mode === "INTERN") return "인턴"
  return "수시"
}

export default function InterviewReviewsPage() {
  const params = useParams<{ companySlug: string }>()
  const searchParams = useSearchParams()
  const companySlug = params?.companySlug ?? ""
  const companyName = useMemo(() => fromCompanySlug(companySlug), [companySlug])
  const requestedReviewId = Number(searchParams?.get("reviewId") ?? "")
  const requestedMode = searchParams?.get("mode")
  const [items, setItems] = useState<InterviewReview[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sort, setSort] = useState<InterviewReviewSort>(Number.isFinite(requestedReviewId) && requestedReviewId > 0 ? "LATEST" : "LIKES")
  const [mode, setMode] = useState<RecruitmentMode>(
    requestedMode === "REGULAR" || requestedMode === "INTERN" || requestedMode === "ROLLING" ? requestedMode : "REGULAR",
  )
  const [stepNames, setStepNames] = useState<string[]>([])
  const [stepQuery, setStepQuery] = useState("")
  const [selectedStepName, setSelectedStepName] = useState("")
  const [showStepSuggestions, setShowStepSuggestions] = useState(false)
  const [selectedReview, setSelectedReview] = useState<InterviewReview | null>(null)
  const [highlightedReviewId, setHighlightedReviewId] = useState<number | null>(null)
  const [pendingLikeReviewIds, setPendingLikeReviewIds] = useState<number[]>([])
  const reviewRefs = useRef<Record<number, HTMLElement | null>>({})
  const autoOpenedReviewIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (requestedMode === "REGULAR" || requestedMode === "INTERN" || requestedMode === "ROLLING") {
      setMode(requestedMode)
    }
  }, [requestedMode])

  useEffect(() => {
    if (Number.isFinite(requestedReviewId) && requestedReviewId > 0) {
      setSort("LATEST")
    }
  }, [requestedReviewId])

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
        const shouldLocateRequestedReview = Number.isFinite(requestedReviewId) && requestedReviewId > 0
        let nextPage = 0
        let lastPage = 0
        let nextHasMore = false
        let mergedItems: InterviewReview[] = []

        while (true) {
          const data = await fetchInterviewReviews(companyName, nextPage, 20, sort, selectedStepName || undefined, mode)
          if (cancelled) return

          const modeFiltered = (data.items ?? []).filter((item) => item.recruitmentMode === mode)
          mergedItems = [...mergedItems, ...modeFiltered]
          lastPage = data.page
          nextHasMore = data.hasNext

          const foundRequestedReview = shouldLocateRequestedReview
            ? mergedItems.some((item) => item.reviewId === requestedReviewId)
            : false

          if (!shouldLocateRequestedReview || foundRequestedReview || !data.hasNext) {
            break
          }

          nextPage += 1
        }

        setItems(mergedItems)
        setPage(lastPage)
        setHasNext(nextHasMore)
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
  }, [companyName, sort, selectedStepName, mode, requestedReviewId])

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

  const renderLikeButton = (review: InterviewReview, isPending: boolean, onClick: MouseEventHandler<HTMLButtonElement>) => (
    <button
      type="button"
      disabled={isPending}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#d7e3ff] bg-[#f7faff] px-2.5 text-[13px] font-semibold text-[#3f5fa8] transition-colors hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ThumbsUp className="h-3.5 w-3.5" />
      <span>{isPending ? "..." : review.likeCount}</span>
    </button>
  )

  const renderDifficultyBadge = (difficulty: InterviewReview["difficulty"]) => {
    const tone = getDifficultyTone(difficulty)
    return (
      <span
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-semibold ${tone.className}`}
      >
        <tone.Icon className="h-3.5 w-3.5" />
        <span>{tone.label}</span>
      </span>
    )
  }

  useEffect(() => {
    if (!Number.isFinite(requestedReviewId) || requestedReviewId <= 0) return
    if (autoOpenedReviewIdRef.current === requestedReviewId) return

    const matched = items.find((item) => item.reviewId === requestedReviewId)
    if (!matched) return

    autoOpenedReviewIdRef.current = requestedReviewId
    const targetNode = reviewRefs.current[requestedReviewId]
    if (targetNode) {
      setHighlightedReviewId(requestedReviewId)
      const targetTop = Math.max(0, window.scrollY + targetNode.getBoundingClientRect().top - 140)
      window.scrollTo({ top: targetTop, behavior: "auto" })
      window.setTimeout(() => {
        setSelectedReview(matched)
      }, 120)
      window.setTimeout(() => {
        setHighlightedReviewId((current) => (current === requestedReviewId ? null : current))
      }, 1200)
      return
    }
    setSelectedReview(matched)
  }, [items, requestedReviewId])

  return (
    <>
      <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-5 rounded-[28px] border border-[#dfe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] p-5 shadow-[0_18px_40px_rgba(97,118,177,0.10)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-black tracking-tight text-[#223971] md:text-[28px]">{companyName} 면접 후기</h1>
              <p className="mt-2 text-sm text-[#7083b4]">{getModeLabel(mode)} 전형 기준으로 등록된 실제 면접 경험을 확인할 수 있습니다.</p>
            </div>
            <Link href={`/search?company=${encodeURIComponent(companyName)}`} className="shrink-0 text-sm font-medium text-primary hover:underline">
              검색으로 돌아가기
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("REGULAR")}
              className={`h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
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
              className={`h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
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
              className={`h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
                mode === "ROLLING"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40"
              }`}
            >
              수시
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm leading-none font-semibold text-[#48639f]">전형 필터</label>
              </div>
              <div className="relative h-11">
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
                      if (!stepQuery.trim()) {
                        clearStepFilter()
                        return
                      }
                      const exact = stepNames.find((name) => name === stepQuery.trim())
                      if (exact) {
                        applyStepFilter(exact)
                      }
                    }
                  }}
                  placeholder="전형명을 입력해 주세요."
                  className="h-full rounded-[16px] text-sm border-[#d8e2fb] bg-white px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.95)]"
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
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm leading-none font-semibold text-[#48639f]">정렬</label>
              <Select value={sort} onValueChange={(value) => setSort(value as InterviewReviewSort)}>
                <SelectTrigger className="h-11 w-full rounded-[16px] data-[size=default]:h-11 text-sm border-[#d8e2fb] bg-white px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.95)]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIKES">좋아요 순</SelectItem>
                  <SelectItem value="LATEST">최신 순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          {items.map((item) => {
            const expandable = shouldShowExpand(item.content)
            const isLikePending = pendingLikeReviewIds.includes(item.reviewId)
            return (
              <article
                key={`review-${item.reviewId}`}
                ref={(node) => {
                  reviewRefs.current[item.reviewId] = node
                }}
                className={`cursor-pointer rounded-xl border bg-card p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)] transition-all hover:bg-[#fbfcff] ${
                  highlightedReviewId === item.reviewId
                    ? "border-[#4d83ff] ring-2 ring-[#bcd1ff] bg-[#f7faff]"
                    : "border-[#d8e2fb]"
                }`}
                onClick={() => setSelectedReview(item)}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="inline-flex h-9 items-center rounded-full border border-[#cfdcff] bg-[#f7faff] px-3 text-[13px] font-bold text-[#3f5fa8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)]">
                    {item.stepName}
                  </span>
                  <div className="flex items-center gap-2">
                    {renderDifficultyBadge(item.difficulty)}
                    {renderLikeButton(item, isLikePending, (event) => {
                      event.stopPropagation()
                      void toggleLike(item)
                    })}
                  </div>
                </div>
                <p className={`break-words text-sm text-foreground ${expandable ? "line-clamp-1" : ""}`}>{item.content}</p>
                {expandable && <span className="mt-1 inline-block text-xs text-primary">자세히 보기</span>}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {item.createdAt.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                  </span>
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

      </main>

      <Dialog open={selectedReview != null} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl !overflow-hidden rounded-[28px] border-[#d8e2fb] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_24px_72px_rgba(98,120,177,0.22)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {selectedReview && (
            <div className="flex max-h-[calc(85vh-2rem)] flex-col gap-4 overflow-hidden">
              <div className="rounded-[22px] border border-[#e3ebff] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9)]">
                <DialogHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3 pr-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-8 items-center rounded-full border border-[#cfdcff] bg-white px-3 text-[13px] font-bold text-[#3f5fa8] shadow-[0_6px_16px_rgba(111,135,196,0.10)]">
                        {selectedReview.stepName}
                      </span>
                      {renderDifficultyBadge(selectedReview.difficulty)}
                    </div>
                  </div>
                  <div className="space-y-1 text-left">
                    <DialogTitle className="text-[19px] font-black tracking-tight text-[#1f366d]">면접 후기 상세</DialogTitle>
                    <p className="text-[13px] text-[#6f83b3]">{selectedReview.stepName} 경험을 실제 후기 내용으로 확인할 수 있습니다.</p>
                  </div>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="nawa-scrollbar h-full w-full overflow-y-auto rounded-[22px] border border-[#dbe5ff] bg-white px-4 py-5 text-[15px] leading-7 text-foreground whitespace-pre-wrap break-words shadow-[0_12px_28px_rgba(110,132,190,0.10)] [scrollbar-gutter:auto] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {selectedReview.content}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[#e8efff] bg-white/72 px-4 py-3">
                <span className="text-[13px] font-medium text-[#6f83b3]">
                  {selectedReview.createdAt.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                </span>
                {renderLikeButton(
                  selectedReview,
                  pendingLikeReviewIds.includes(selectedReview.reviewId),
                  () => void toggleLike(selectedReview),
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
