"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Sparkles, TrendingUp } from "lucide-react"
import {
  fetchHomeHotCompanies,
  fetchHomeLatestInterviewReviews,
  fetchHomeLatestReports,
  searchCompanies,
} from "@/lib/api"
import { CompanyIcon } from "@/components/company-icon"
import { toCompanySlug } from "@/lib/company-slug"
import type { CompanySearchItem, HomeHotCompanyItem, HomeLatestReportItem, InterviewReview } from "@/lib/types"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { buildWebsiteJsonLd } from "@/lib/seo-metadata"
import { buildCompanyDetailPath } from "@/lib/company-detail-route"
import { cn } from "@/lib/utils"

const statChips = [
  { label: "최근 제보", value: "56건", tone: "warm" },
  { label: "주목할 회사", value: "TOP 3", tone: "cool" },
  { label: "실시간 등록 알림", value: "123건", tone: "soft" },
]

const showStatChips = false

const formatDifficultyLabel = (difficulty: InterviewReview["difficulty"]) => {
  if (difficulty === "HARD") return "어려움"
  if (difficulty === "EASY") return "쉬움"
  return "보통"
}

const formatRecruitmentModeLabel = (mode: InterviewReview["recruitmentMode"]) => {
  if (mode === "REGULAR") return "공채"
  if (mode === "INTERN") return "인턴"
  return "수시"
}

const truncateInterviewPreview = (content: string) => {
  const normalized = content.replace(/\s+/g, " ").trim()
  if (normalized.length <= 72) return normalized
  return `${normalized.slice(0, 72)}...`
}

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [relatedResults, setRelatedResults] = useState<CompanySearchItem[]>([])
  const [showRelatedSuggestions, setShowRelatedSuggestions] = useState(true)
  const [latestReports, setLatestReports] = useState<HomeLatestReportItem[]>([])
  const [isLatestReportsLoading, setIsLatestReportsLoading] = useState(true)
  const [latestInterviewReviews, setLatestInterviewReviews] = useState<InterviewReview[]>([])
  const [isLatestInterviewReviewsLoading, setIsLatestInterviewReviewsLoading] = useState(true)
  const [hotCompaniesFeed, setHotCompaniesFeed] = useState<HomeHotCompanyItem[]>([])
  const [isHotCompaniesLoading, setIsHotCompaniesLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setIsLatestReportsLoading(true)
      setIsLatestInterviewReviewsLoading(true)
      setIsHotCompaniesLoading(true)
      const [latestData, interviewData, hotData] = await Promise.all([
        fetchHomeLatestReports(5),
        fetchHomeLatestInterviewReviews(3),
        fetchHomeHotCompanies(5),
      ])
      if (!mounted) return
      setLatestReports(latestData)
      setLatestInterviewReviews(interviewData)
      setHotCompaniesFeed(hotData)
      setIsLatestReportsLoading(false)
      setIsLatestInterviewReviewsLoading(false)
      setIsHotCompaniesLoading(false)
    })()

    return () => {
      mounted = false
    }
  }, [])

  const normalizedQuery = useMemo(() => query.trim(), [query])
  const exactMatch = useMemo(() => {
    if (!normalizedQuery) return false
    return relatedResults.some((item) => item.companyName?.toLowerCase() === normalizedQuery.toLowerCase())
  }, [normalizedQuery, relatedResults])
  const shouldShowRelatedSuggestions =
    showRelatedSuggestions && Boolean(normalizedQuery) && relatedResults.length > 0 && !exactMatch

  useEffect(() => {
    if (!normalizedQuery) {
      setRelatedResults([])
      return
    }

    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await searchCompanies(normalizedQuery, 6).catch(() => [])
      if (cancelled) return
      setRelatedResults(data ?? [])
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [normalizedQuery])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search")
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-[linear-gradient(180deg,#eef4ff_0%,#f7faff_34%,#eff5ff_72%,#f9fbff_100%)] dark:bg-[linear-gradient(180deg,#0d1424_0%,#10192c_34%,#0f1728_72%,#0b1220_100%)]">
      <SeoJsonLd data={buildWebsiteJsonLd()} />
      <div className="page-shell [--page-max:1280px] pb-8 pt-4 md:pt-8">
        <div className="mx-auto flex w-full flex-col gap-5 md:gap-6">
          <section className="relative overflow-visible rounded-[30px] border border-[#d8e5ff] bg-[linear-gradient(135deg,#3772f5_0%,#2b62e6_58%,#3a7be8_100%)] px-4 pb-6 pt-7 shadow-[0_30px_80px_rgba(65,105,220,0.18)] dark:border-[#31415f] dark:bg-[linear-gradient(135deg,#142240_0%,#1c315d_58%,#1a3a6f_100%)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.38)] md:px-8 md:pb-8 md:pt-9">
            <Image src="/design-previews/icon/hero-background.png" alt="" fill priority className="object-cover object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(34,76,192,0.12)_0%,rgba(34,76,192,0.2)_62%,rgba(78,183,210,0.16)_100%)]" />
            <div className="absolute -right-16 -top-20 hidden h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(223,246,255,0.34)_0%,rgba(223,246,255,0)_72%)] md:block" />
            <div className="absolute -left-10 bottom-6 hidden h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(207,239,255,0.24)_0%,rgba(207,239,255,0)_74%)] md:block" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.08)_100%)]" />
            <Image src="/design-previews/icon/hero-mascots.png" alt="" width={124} height={82} className="absolute right-4 top-4 hidden opacity-95 md:block" />

            <div className="relative z-20 mx-auto flex max-w-full flex-col items-center text-center text-white md:max-w-[860px]">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/70">HIRING SIGNAL DASHBOARD</p>
              <h1 className="mt-3 text-[30px] font-black tracking-tight md:text-[46px]">언제나와</h1>
              <p className="mt-3 max-w-[280px] text-sm leading-6 text-white/90 md:max-w-none md:text-base">회사별 발표 흐름과 전형 타임라인을 빠르게 검색하세요.</p>

              <form
                onSubmit={handleSearch}
                className="relative z-40 mt-7 flex w-full max-w-full flex-col gap-2 rounded-[20px] bg-white/94 p-2 shadow-[0_18px_40px_rgba(18,47,126,0.18)] backdrop-blur-sm dark:bg-[#111b2f]/92 dark:shadow-[0_18px_40px_rgba(0,0,0,0.36)] md:max-w-[760px] md:flex-row md:items-center"
              >
                <div className="relative min-w-0 flex-1">
                  <div className="relative flex min-w-0 items-center rounded-[16px] border border-[#d9e5ff] bg-[#f9fbff] px-4 py-3 dark:border-[#31415f] dark:bg-[#0f1729]">
                    <Search className="h-4 w-4 shrink-0 text-[#6c87c7] dark:text-[#8fa7df]" />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setShowRelatedSuggestions(true)
                      }}
                      onFocus={() => setShowRelatedSuggestions(true)}
                      placeholder="기업명 또는 공고를 입력하세요"
                      className="home-search-input w-full min-w-0 appearance-none bg-transparent pl-3 pr-12 text-sm font-medium text-[#223d7a] outline-none placeholder:text-[#8ca2cf] dark:text-[#eef4ff] dark:placeholder:text-[#7f93bb] md:pr-14"
                    />
                    <span className="pointer-events-none absolute right-4 hidden text-xs font-semibold text-[#8ca2cf] dark:text-[#7f93bb] md:inline">
                      ⌘ /
                    </span>
                  </div>
                  {shouldShowRelatedSuggestions && (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 rounded-[20px] border border-[#dfe6ff] bg-white p-2 text-left shadow-[0_18px_36px_rgba(97,118,177,0.14)] dark:border-[#31415f] dark:bg-[#16213a] dark:shadow-[0_22px_44px_rgba(0,0,0,0.38)]">
                      <p className="px-2 pb-1 text-xs font-medium text-[#7083b4] dark:text-[#9bb0df]">연관 검색어</p>
                      <div className="max-h-64 overflow-auto">
                        {relatedResults.map((company) => (
                          <button
                            key={`related-${company.companyName}`}
                            type="button"
                            onClick={() => {
                              setQuery(company.companyName)
                              setShowRelatedSuggestions(false)
                              router.push(`/search?q=${encodeURIComponent(company.companyName)}`)
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#223d7a] transition-colors hover:bg-[#eef4ff] dark:text-[#eef4ff] dark:hover:bg-[#1b2a47]"
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
                  className="inline-flex h-[52px] shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#4d84ff_0%,#2a63e8_100%)] px-6 text-sm font-bold text-white shadow-[0_12px_28px_rgba(44,92,221,0.24)]"
                >
                  발표일 검색
                </button>
              </form>

              {showStatChips ? (
                <div className="mt-4 grid w-full max-w-[820px] gap-2 md:grid-cols-3">
                  {statChips.map((chip) => (
                    <div
                      key={chip.label}
                      className={cn(
                        "rounded-[14px] border px-4 py-3 text-left shadow-[0_8px_18px_rgba(25,53,132,0.08)]",
                        chip.tone === "warm" &&
                          "border-[#e2ebff] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(236,243,255,0.9)_100%)] dark:border-[#31415f] dark:bg-[linear-gradient(180deg,rgba(18,28,49,0.92)_0%,rgba(25,39,67,0.9)_100%)]",
                        chip.tone === "cool" &&
                          "border-[#dce8ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(238,247,255,0.9)_100%)] dark:border-[#31415f] dark:bg-[linear-gradient(180deg,rgba(20,30,52,0.94)_0%,rgba(24,37,61,0.9)_100%)]",
                        chip.tone === "soft" &&
                          "border-[#d9ebff] bg-[linear-gradient(180deg,rgba(255,255,255,0.93)_0%,rgba(230,245,255,0.88)_100%)] dark:border-[#31415f] dark:bg-[linear-gradient(180deg,rgba(18,30,54,0.93)_0%,rgba(21,35,62,0.88)_100%)]",
                      )}
                    >
                      <p className="text-[11px] font-semibold text-[#6d84c1] dark:text-[#90a6d8]">{chip.label}</p>
                      <p className="mt-1 text-[13px] font-bold text-[#233f80] dark:text-[#eef4ff]">{chip.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid items-stretch gap-4 xl:grid-cols-3">
            <article className="relative overflow-hidden rounded-[24px] border border-[#dfe6ff] bg-white/95 p-5 shadow-[0_18px_40px_rgba(97,118,177,0.1)] dark:border-[#31415f] dark:bg-[#121a2d]/95 dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)]">
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[#223971] dark:text-[#edf3ff]">최근 등록된 발표 제보</h2>
                    <p className="mt-1 text-[12px] text-[#7083b4] dark:text-[#98abd7]">가장 최근에 등록된 발표 흐름을 빠르게 확인하세요</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {isLatestReportsLoading ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      최신 발표 제보를 불러오는 중입니다.
                    </div>
                  ) : latestReports.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      <p className="font-semibold text-[#36538f] dark:text-[#c8d8ff]">새 제보가 들어오면 이곳에 가장 먼저 보여드릴게요.</p>
                      <p className="mt-2">지금은 발표일 검색에서 전체 흐름을 먼저 확인해보세요.</p>
                    </div>
                  ) : (
                    latestReports.map((item, index) => (
                      <Link
                        key={`${item.companyName}-${item.stepName}-${item.updatedAt?.toISOString() ?? "latest"}`}
                        href={buildCompanyDetailPath(item.companyName, item.recruitmentMode, item.stepName)}
                        className="flex items-center gap-3 rounded-[18px] border border-[#e4eaff] bg-white/96 px-4 py-2.5 shadow-[0_10px_22px_rgba(111,135,196,0.08)] transition-transform hover:-translate-y-0.5 dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#1fc8b8_0%,#109e95_100%)] text-sm font-extrabold text-white">
                          {index + 1}
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <CompanyIcon companyId={item.companyId} companyName={item.companyName} size={38} textClassName="text-xs" />
                          <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">{item.companyName}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[linear-gradient(180deg,#eef4ff_0%,#e5f1ff_100%)] px-2.5 py-1 text-[10px] font-semibold text-[#5972c3] dark:bg-[linear-gradient(180deg,#21304f_0%,#1a2741_100%)] dark:text-[#bdd0ff]">
                          {item.stepName}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </article>

            <article className="relative h-full overflow-hidden rounded-[24px] border border-[#dfe6ff] bg-white/95 p-5 shadow-[0_18px_40px_rgba(97,118,177,0.1)] dark:border-[#31415f] dark:bg-[#121a2d]/95 dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)]">
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[#223971] dark:text-[#edf3ff]">최근 등록된 면접 정보</h2>
                    <p className="mt-1 text-[12px] text-[#7083b4] dark:text-[#98abd7]">실제 지원 경험이 담긴 최신 면접 후기를 빠르게 확인하세요</p>
                  </div>
                </div>

                <div className="mt-4 flex-1">
                  {isLatestInterviewReviewsLoading ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      최신 면접 정보를 불러오는 중입니다.
                    </div>
                  ) : latestInterviewReviews.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      등록된 면접 정보가 쌓이면 이곳에 가장 먼저 보여드릴게요.
                    </div>
                  ) : (
                    <div className="flex h-full flex-col justify-between gap-3">
                      {latestInterviewReviews.map((review, index) => (
                        <Link
                          key={`interview-${review.reviewId}-${review.createdAt.toISOString()}`}
                          href={`/interview-reviews/${toCompanySlug(review.companyName ?? "")}?reviewId=${review.reviewId}&mode=${review.recruitmentMode}`}
                          className="block rounded-[18px] border border-[#e4eaff] bg-white/96 px-4 py-3 shadow-[0_10px_22px_rgba(111,135,196,0.08)] transition-transform hover:-translate-y-0.5 dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#4d83ff_0%,#2a61e6_100%)] text-sm font-extrabold text-white">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-3">
                                <CompanyIcon companyId={review.companyId} companyName={review.companyName ?? "-"} size={38} textClassName="text-xs" />
                                <div className="min-w-0">
                                  <p className="truncate text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">{review.companyName ?? "-"}</p>
                                  <p className="mt-0.5 text-[11px] text-[#6f82b3] dark:text-[#98abd7]">
                                    {review.stepName} · {formatRecruitmentModeLabel(review.recruitmentMode)} · 난이도 {formatDifficultyLabel(review.difficulty)}
                                  </p>
                                </div>
                              </div>
                              <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#5f72a5] dark:text-[#b4c3e7]">
                                {truncateInterviewPreview(review.content)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <article className="relative h-full overflow-hidden rounded-[24px] border border-[#dfe6ff] bg-white/95 p-5 shadow-[0_18px_40px_rgba(97,118,177,0.1)] dark:border-[#31415f] dark:bg-[#121a2d]/95 dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)]">
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[#223971] dark:text-[#edf3ff]">업데이트가 많은 회사</h2>
                    <p className="mt-1 text-[12px] text-[#7083b4] dark:text-[#98abd7]">누적 발표 제보와 일정 갱신이 많은 회사를 모아 보여드립니다</p>
                  </div>
                  <TrendingUp className="mt-1 h-5 w-5 text-[#7090ea] dark:text-[#9db5ff]" />
                </div>

                <div className="mt-4 flex-1 space-y-3">
                  {isHotCompaniesLoading ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      업데이트가 많은 회사를 불러오는 중입니다.
                    </div>
                  ) : hotCompaniesFeed.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      누적 업데이트가 많은 회사가 집계되면 이곳에 보여드릴게요.
                    </div>
                  ) : (
                    hotCompaniesFeed.map((company, index) => (
                      <Link
                        key={`${company.companyName}-${company.latestStepName}-${company.updatedAt?.toISOString() ?? "hot"}`}
                        href={buildCompanyDetailPath(company.companyName)}
                        className="flex items-center gap-3 rounded-[18px] border border-[#e4eaff] bg-white/96 px-4 py-2.5 shadow-[0_10px_22px_rgba(111,135,196,0.08)] transition-transform hover:-translate-y-0.5 dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#4d83ff_0%,#2a61e6_100%)] text-sm font-extrabold text-white">
                          {index + 1}
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <CompanyIcon companyId={company.companyId} companyName={company.companyName} size={38} textClassName="text-xs" />
                          <p className="truncate text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">{company.companyName}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </article>
          </section>

          <section className="relative overflow-hidden rounded-[24px] border border-[#dfe6ff] bg-white/95 p-5 shadow-[0_18px_40px_rgba(97,118,177,0.1)] dark:border-[#31415f] dark:bg-[#121a2d]/95 dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)]">
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[22px] font-extrabold tracking-tight text-[#223971] dark:text-[#edf3ff]">검색 활용 가이드</h2>
                  <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-[#7083b4] dark:text-[#98abd7]">
                    처음 들어와도 무엇을 먼저 봐야 하는지 바로 이해할 수 있도록, 지금 공개한 핵심 흐름만 간단하게 정리했습니다.
                  </p>
                </div>
                <Sparkles className="mt-1 h-5 w-5 text-[#7090ea] dark:text-[#9db5ff]" />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[18px] border border-[#e4eaff] bg-white/96 px-5 py-5 shadow-[0_10px_22px_rgba(111,135,196,0.08)] dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                  <p className="text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">1. 회사명으로 바로 검색</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#6f82b3] dark:text-[#98abd7]">삼성전자, 카카오, 네이버처럼 회사명을 입력하면 관련 발표 흐름을 바로 찾을 수 있습니다.</p>
                </div>
                <div className="rounded-[18px] border border-[#e4eaff] bg-white/96 px-5 py-5 shadow-[0_10px_22px_rgba(111,135,196,0.08)] dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                  <p className="text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">2. 최신 카드부터 확인</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#6f82b3] dark:text-[#98abd7]">최근 발표 제보와 면접 정보를 먼저 훑어보면 지금 올라오는 흐름을 빠르게 파악할 수 있습니다.</p>
                </div>
                <div className="rounded-[18px] border border-[#e4eaff] bg-white/96 px-5 py-5 shadow-[0_10px_22px_rgba(111,135,196,0.08)] dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                  <p className="text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">3. 검색 결과에서 단계 좁히기</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#6f82b3] dark:text-[#98abd7]">회사 검색 후 전형 유형과 단계 정보를 좁혀 보면 원하는 발표일에 더 빨리 도달할 수 있습니다.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
