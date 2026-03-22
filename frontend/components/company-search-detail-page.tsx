"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, MessageSquareText, Search } from "lucide-react"
import { CompanyDetailPanel } from "@/components/company-detail-panel"
import { CompanyIcon } from "@/components/company-icon"
import { CompanyChatRoom } from "@/components/chat/company-chat-room"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fetchCompanyLeadTime, fetchCompanyStatus } from "@/lib/api"
import { buildCompanyDetailPath, type CompanyDetailMode } from "@/lib/company-detail-route"
import { toCompanySlug } from "@/lib/company-slug"
import type { CompanySearchItem, CompanyStatus, InterviewReview, KeywordLeadTime } from "@/lib/types"

type CompanySearchDetailPageProps = {
  companyName: string
  initialMode?: CompanyDetailMode | null
  initialStep?: string | null
}

export function CompanySearchDetailPage({
  companyName,
  initialMode = null,
  initialStep = null,
}: CompanySearchDetailPageProps) {
  const router = useRouter()
  const [status, setStatus] = useState<CompanyStatus | null>(null)
  const [leadTime, setLeadTime] = useState<KeywordLeadTime | null>(null)
  const [keyword, setKeyword] = useState("")
  const [lastLeadTimeKeyword, setLastLeadTimeKeyword] = useState("")
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [isCalendarVisible, setIsCalendarVisible] = useState(false)
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  const [isLeadTimeLoading, setIsLeadTimeLoading] = useState(false)
  const [selectedInterviewReview, setSelectedInterviewReview] = useState<InterviewReview | null>(null)
  const [currentMode, setCurrentMode] = useState<CompanyDetailMode | null>(initialMode)
  const [currentStep, setCurrentStep] = useState<string | null>(initialStep)

  useEffect(() => {
    let cancelled = false

    setIsStatusLoading(true)
    setLeadTime(null)
    setKeyword("")
    setLastLeadTimeKeyword("")
    setSelectedCalendarDate(null)
    setIsCalendarVisible(false)

    ;(async () => {
      const data = await fetchCompanyStatus(companyName)
      if (cancelled) return
      setStatus(data)
      setIsStatusLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [companyName])

  useEffect(() => {
    setCurrentMode(initialMode)
    setCurrentStep(initialStep)
  }, [initialMode, initialStep])

  useEffect(() => {
    const nextPath = buildCompanyDetailPath(companyName, currentMode, currentStep)
    router.replace(nextPath, { scroll: false })
  }, [companyName, currentMode, currentStep, router])

  const company = useMemo<CompanySearchItem>(
    () => ({
      companyId: status?.companyId ?? null,
      companyName,
      lastResultAt: null,
    }),
    [companyName, status?.companyId],
  )

  const modeStepLinks = useMemo(
    () => ({
      REGULAR: Array.from(
        new Set(
          status?.regularTimelines
            .flatMap((item) => item.steps.map((step) => step.label))
            .filter((value): value is string => Boolean(value?.trim())) ?? [],
        ),
      ),
      INTERN: Array.from(
        new Set(
          status?.internTimelines
            .flatMap((item) => item.steps.map((step) => step.label))
            .filter((value): value is string => Boolean(value?.trim())) ?? [],
        ),
      ),
      ROLLING: Array.from(
        new Set(status?.rollingSteps.map((item) => item.stepName).filter((value): value is string => Boolean(value?.trim())) ?? []),
      ),
    }),
    [status],
  )

  const handleKeywordSearch = async (
    event: React.FormEvent,
    keywordOverride?: string,
    modeOverride: "REGULAR" | "INTERN" = "REGULAR",
  ) => {
    event.preventDefault()
    const trimmed = (keywordOverride ?? keyword).trim()
    if (!trimmed) return

    setIsLeadTimeLoading(true)
    try {
      const result = await fetchCompanyLeadTime(companyName, trimmed, modeOverride)
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

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    if (lastLeadTimeKeyword && value.trim() !== lastLeadTimeKeyword) {
      setLeadTime(null)
      setSelectedCalendarDate(null)
      setIsCalendarVisible(false)
      setLastLeadTimeKeyword("")
    }
  }

  const handleQuickReport = (
    targetCompanyName: string,
    mode: "REGULAR" | "ROLLING" | "INTERN",
    options?: { todayAnnouncement?: boolean },
  ) => {
    if (typeof window === "undefined") return
    window.dispatchEvent(
      new CustomEvent("open_report_modal", {
        detail: {
          companyName: targetCompanyName,
          mode,
          todayAnnouncement: Boolean(options?.todayAnnouncement),
        },
      }),
    )
  }

  return (
    <div className="page-shell [--page-max:1120px] py-4 md:py-8">
      <section className="rounded-[28px] border border-[#dfe6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] px-5 pb-5 pt-6 shadow-[0_22px_50px_rgba(97,118,177,0.10)] dark:border-[#31415f] dark:bg-[linear-gradient(180deg,#11172a_0%,#131b31_100%)] dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)] md:px-7 md:pb-7 md:pt-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <CompanyIcon companyId={company.companyId} companyName={companyName} size={56} textClassName="text-xl" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-[#6c83bb] dark:text-[#8ea4d8]">COMPANY DETAIL</p>
                <h1 className="mt-2 truncate text-[28px] font-black tracking-tight text-[#203872] dark:text-[#edf3ff] md:text-[34px]">
                  {companyName}
                </h1>
                <p className="mt-2 max-w-[640px] text-sm leading-6 text-[#6177af] dark:text-[#9cb0df] md:text-[15px]">
                  {companyName} 서류 발표, 면접 결과 발표, 전형별 평균 소요 기간과 실제 후기를 한 페이지에서 확인하세요.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/search?q=${encodeURIComponent(companyName)}&company=${encodeURIComponent(companyName)}`}
              className="inline-flex h-11 items-center justify-center rounded-[16px] border border-[#dce4ff] bg-white px-4 text-sm font-semibold text-[#2f5fdd] dark:border-[#31415f] dark:bg-[#16213a] dark:text-[#c8d7ff]"
            >
              <Search className="mr-2 h-4 w-4" />
              검색 화면으로 보기
            </Link>
            <Link
              href={`/board/${toCompanySlug(companyName)}`}
              className="inline-flex h-11 items-center justify-center rounded-[16px] border border-[#dce4ff] bg-white px-4 text-sm font-semibold text-[#2f5fdd] dark:border-[#31415f] dark:bg-[#16213a] dark:text-[#c8d7ff]"
            >
              <MessageSquareText className="mr-2 h-4 w-4" />
              게시판 가기
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e4ff] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4966a8] dark:border-[#31415f] dark:bg-[#16203a] dark:text-[#bdd0ff]">
            <CalendarClock className="h-3.5 w-3.5" />
            발표일 평균 소요 기간 확인
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e4ff] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4966a8] dark:border-[#31415f] dark:bg-[#16203a] dark:text-[#bdd0ff]">
            <MessageSquareText className="h-3.5 w-3.5" />
            실제 면접 후기 바로 확인
          </span>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-2xl border border-border/50 bg-card">
          {isStatusLoading && !status ? (
            <div className="flex min-h-[320px] items-center justify-center p-8 text-sm text-muted-foreground">
              회사 상세 데이터를 불러오는 중입니다.
            </div>
          ) : (
            <CompanyDetailPanel
              company={company}
              status={status}
              leadTime={leadTime}
              keyword={keyword}
              lastLeadTimeKeyword={lastLeadTimeKeyword}
              onKeywordChange={handleKeywordChange}
              onKeywordSearch={handleKeywordSearch}
              selectedCalendarDate={selectedCalendarDate}
              onCalendarDateSelect={setSelectedCalendarDate}
              isCalendarVisible={isCalendarVisible}
              isStatusLoading={isStatusLoading}
              isLeadTimeLoading={isLeadTimeLoading}
              onInterviewReviewSelect={setSelectedInterviewReview}
              onQuickReport={handleQuickReport}
              onActiveModeChange={setCurrentMode}
              onSelectedStepChange={setCurrentStep}
              initialMode={initialMode ?? undefined}
              initialStep={initialStep ?? undefined}
              className="h-full"
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">페이지 안내</h2>
            <div className="mt-3 space-y-2 text-sm leading-6 text-foreground/85">
              <p>{companyName}의 공채, 인턴, 수시 전형 데이터를 한 URL에서 모아볼 수 있도록 구성했습니다.</p>
              <p>전형별 발표일 데이터와 면접 후기를 바탕으로 평균 소요 기간을 바로 확인할 수 있습니다.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={buildCompanyDetailPath(companyName, "REGULAR")} className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                공채 URL
              </Link>
              <Link href={buildCompanyDetailPath(companyName, "INTERN")} className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                인턴 URL
              </Link>
              <Link href={buildCompanyDetailPath(companyName, "ROLLING")} className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                수시 URL
              </Link>
            </div>
            {status && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">단계별 바로가기</p>
                <div className="space-y-2">
                  {(["REGULAR", "INTERN", "ROLLING"] as const).map((mode) =>
                    modeStepLinks[mode].length > 0 ? (
                      <div key={`detail-step-group-${mode}`}>
                        <p className="mb-1 text-[11px] text-muted-foreground">
                          {mode === "REGULAR" ? "공채" : mode === "INTERN" ? "인턴" : "수시"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {modeStepLinks[mode].slice(0, 6).map((stepName) => (
                            <Link
                              key={`detail-step-link-${mode}-${stepName}`}
                              href={buildCompanyDetailPath(companyName, mode, stepName)}
                              className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              {stepName}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            )}
          </div>

          <CompanyChatRoom companyId={status?.companyId ?? null} companyName={companyName} />
        </aside>
      </section>

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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
