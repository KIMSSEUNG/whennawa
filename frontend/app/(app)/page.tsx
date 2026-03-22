"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, ChevronRight, Search, Sparkles, TrendingUp } from "lucide-react"
import {
  fetchHomeHotCompanies,
  fetchHomeLatestReports,
  fetchNotifications,
  fetchNotificationSubscriptions,
  getUser,
  searchCompanies,
} from "@/lib/api"
import type { CompanySearchItem, HomeHotCompanyItem, HomeLatestReportItem, NotificationSubscription, UserNotification } from "@/lib/types"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { buildWebsiteJsonLd } from "@/lib/seo-metadata"
import { cn } from "@/lib/utils"

const statChips = [
  { label: "최근 제보", value: "56건", tone: "warm" },
  { label: "주목할 회사", value: "TOP 3", tone: "cool" },
  { label: "실시간 등록 알림", value: "123건", tone: "soft" },
]

const showStatChips = false

const reportBoards = [
  {
    href: "/board",
    title: "회사 정보 게시판",
    description: "기업별 정보와 후기를 확인하세요",
    icon: "/design-previews/icon/board-company.png",
  },
  {
    href: "/career-board",
    title: "취업 고민 게시판",
    description: "고민과 경험을 함께 나누세요",
    icon: "/design-previews/icon/board-career.png",
  },
  {
    href: "/search",
    title: "발표일 탐색",
    description: "원하는 회사의 발표 흐름을 빠르게 확인하세요",
    icon: "/design-previews/icon/search-company.png",
  },
  {
    href: "/notifications",
    title: "알림 관리",
    description: "관심 회사 발표만 선택해서 받아보세요",
    icon: "/design-previews/icon/notifications.png",
  },
]

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [relatedResults, setRelatedResults] = useState<CompanySearchItem[]>([])
  const [showRelatedSuggestions, setShowRelatedSuggestions] = useState(true)
  const [latestReports, setLatestReports] = useState<HomeLatestReportItem[]>([])
  const [isLatestReportsLoading, setIsLatestReportsLoading] = useState(true)
  const [hotCompaniesFeed, setHotCompaniesFeed] = useState<HomeHotCompanyItem[]>([])
  const [isHotCompaniesLoading, setIsHotCompaniesLoading] = useState(true)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([])
  const [notifications, setNotifications] = useState<UserNotification[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setIsLatestReportsLoading(true)
      setIsHotCompaniesLoading(true)
      const [latestData, hotData] = await Promise.all([fetchHomeLatestReports(3), fetchHomeHotCompanies(3)])
      if (!mounted) return
      setLatestReports(latestData)
      setHotCompaniesFeed(hotData)
      setIsLatestReportsLoading(false)
      setIsHotCompaniesLoading(false)
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const user = await getUser().catch(() => null)
      if (!mounted) return

      const authed = Boolean(user)
      setIsAuthenticated(authed)
      setIsAuthChecked(true)
      if (!authed) return

      const [subData, notiData] = await Promise.all([
        fetchNotificationSubscriptions(0, 20),
        fetchNotifications(0, 20),
      ])

      if (!mounted) return
      setSubscriptions(subData.items ?? [])
      setNotifications(notiData.items ?? [])
    })()

    return () => {
      mounted = false
    }
  }, [])

  const notificationsByCompanyId = useMemo(() => {
    const grouped = new Map<number, UserNotification[]>()
    for (const item of notifications) {
      if (item.companyId == null) continue
      const prev = grouped.get(item.companyId) ?? []
      prev.push(item)
      grouped.set(item.companyId, prev)
    }
    return grouped
  }, [notifications])

  const previewSubscriptions = useMemo(() => {
    const sorted = [...subscriptions].sort((a, b) => {
      const aCount = a.companyId == null ? 0 : (notificationsByCompanyId.get(a.companyId)?.length ?? 0)
      const bCount = b.companyId == null ? 0 : (notificationsByCompanyId.get(b.companyId)?.length ?? 0)
      const aHas = aCount > 0 ? 1 : 0
      const bHas = bCount > 0 ? 1 : 0
      if (aHas !== bHas) return bHas - aHas
      return a.companyName.localeCompare(b.companyName, "ko-KR")
    })
    return sorted.slice(0, 2)
  }, [subscriptions, notificationsByCompanyId])

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
    <div className="min-h-full bg-[linear-gradient(180deg,#eef4ff_0%,#f7faff_34%,#eff5ff_72%,#f9fbff_100%)] dark:bg-[linear-gradient(180deg,#0d1424_0%,#10192c_34%,#0f1728_72%,#0b1220_100%)]">
      <SeoJsonLd data={buildWebsiteJsonLd()} />
      <div className="page-shell [--page-max:1280px] pb-8 pt-4 md:pt-8">
        <div className="mx-auto flex w-full flex-col gap-5 md:gap-6">
          <section className="relative overflow-visible rounded-[30px] border border-[#d8e5ff] bg-[linear-gradient(135deg,#3772f5_0%,#2b62e6_58%,#3a7be8_100%)] px-5 pb-6 pt-7 shadow-[0_30px_80px_rgba(65,105,220,0.18)] dark:border-[#31415f] dark:bg-[linear-gradient(135deg,#142240_0%,#1c315d_58%,#1a3a6f_100%)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.38)] md:px-8 md:pb-8 md:pt-9">
            <Image src="/design-previews/icon/hero-background.png" alt="" fill priority className="object-cover object-center" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(34,76,192,0.12)_0%,rgba(34,76,192,0.2)_62%,rgba(78,183,210,0.16)_100%)]" />
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(223,246,255,0.34)_0%,rgba(223,246,255,0)_72%)]" />
            <div className="absolute -left-10 bottom-6 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(207,239,255,0.24)_0%,rgba(207,239,255,0)_74%)]" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.08)_100%)]" />
            <Image src="/design-previews/icon/hero-mascots.png" alt="" width={124} height={82} className="absolute right-4 top-4 hidden opacity-95 md:block" />

            <div className="relative z-20 mx-auto flex max-w-[860px] flex-col items-center text-center text-white">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/70">HIRING SIGNAL DASHBOARD</p>
              <h1 className="mt-3 text-[34px] font-black tracking-tight md:text-[46px]">언제나와</h1>
              <p className="mt-3 text-sm text-white/90 md:text-base">취업 정보, 제보, 커뮤니티를 한 화면에서 빠르게 확인하세요.</p>

              <form
                onSubmit={handleSearch}
                className="mt-7 flex w-full max-w-[760px] flex-col gap-2 rounded-[20px] bg-white/94 p-2 shadow-[0_18px_40px_rgba(18,47,126,0.18)] backdrop-blur-sm dark:bg-[#111b2f]/92 dark:shadow-[0_18px_40px_rgba(0,0,0,0.36)] md:flex-row md:items-center"
              >
                <div className="relative min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-3 rounded-[16px] border border-[#d9e5ff] bg-[#f9fbff] px-4 py-3 dark:border-[#31415f] dark:bg-[#0f1729]">
                  <Search className="h-4 w-4 shrink-0 text-[#6c87c7] dark:text-[#8fa7df]" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setShowRelatedSuggestions(true)
                    }}
                    onFocus={() => setShowRelatedSuggestions(true)}
                    placeholder="기업명 또는 공고를 입력하세요"
                    className="w-full bg-transparent text-sm font-medium text-[#223d7a] outline-none placeholder:text-[#8ca2cf] dark:text-[#eef4ff] dark:placeholder:text-[#7f93bb]"
                  />
                  <span className="hidden text-xs font-semibold text-[#8ca2cf] dark:text-[#7f93bb] md:inline">⌘ /</span>
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
                            {company.companyName}
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

          <section className="grid gap-4 xl:grid-cols-[0.92fr_0.92fr_1.16fr]">
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
                      <p className="mt-2">지금은 발표일 검색에서 전체 흐름을 확인하거나, 관심 회사를 알림에 등록해보세요.</p>
                    </div>
                  ) : (
                    latestReports.map((item, index) => (
                      <Link
                        key={`${item.companyName}-${item.stepName}-${item.updatedAt?.toISOString() ?? "latest"}`}
                        href={`/search?q=${encodeURIComponent(item.companyName)}`}
                        className="flex items-center gap-3 rounded-[18px] border border-[#e4eaff] bg-white/96 px-4 py-2.5 shadow-[0_10px_22px_rgba(111,135,196,0.08)] transition-transform hover:-translate-y-0.5 dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#1fc8b8_0%,#109e95_100%)] text-sm font-extrabold text-white">
                          {index + 1}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">{item.companyName}</p>
                        <span className="shrink-0 rounded-full bg-[linear-gradient(180deg,#eef4ff_0%,#e5f1ff_100%)] px-2.5 py-1 text-[10px] font-semibold text-[#5972c3] dark:bg-[linear-gradient(180deg,#21304f_0%,#1a2741_100%)] dark:text-[#bdd0ff]">
                          {item.stepName}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[24px] border border-[#dfe6ff] bg-white/95 p-5 shadow-[0_18px_40px_rgba(97,118,177,0.1)] dark:border-[#31415f] dark:bg-[#121a2d]/95 dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)]">
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[#223971] dark:text-[#edf3ff]">최근 업데이트가 많은 회사</h2>
                    <p className="mt-1 text-[12px] text-[#7083b4] dark:text-[#98abd7]">최근 7일 동안 발표 제보와 일정 갱신이 활발했던 회사</p>
                  </div>
                  <TrendingUp className="mt-1 h-5 w-5 text-[#7090ea] dark:text-[#9db5ff]" />
                </div>

                <div className="mt-4 space-y-3">
                  {isHotCompaniesLoading ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      최근 업데이트가 많은 회사를 계산하는 중입니다.
                    </div>
                  ) : hotCompaniesFeed.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      최근 7일 기준으로 활발한 회사가 집계되면 이곳에 보여드릴게요.
                    </div>
                  ) : (
                    hotCompaniesFeed.map((company, index) => (
                      <Link
                        key={`${company.companyName}-${company.latestStepName}-${company.updatedAt?.toISOString() ?? "hot"}`}
                        href={`/search?q=${encodeURIComponent(company.companyName)}`}
                        className="flex items-center gap-3 rounded-[18px] border border-[#e4eaff] bg-white/96 px-4 py-2.5 shadow-[0_10px_22px_rgba(111,135,196,0.08)] transition-transform hover:-translate-y-0.5 dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,#4d83ff_0%,#2a61e6_100%)] text-sm font-extrabold text-white">
                          {index + 1}
                        </div>
                        <p className="truncate text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">{company.companyName}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[24px] border border-[#dfe6ff] bg-white/95 p-5 shadow-[0_18px_40px_rgba(97,118,177,0.1)] dark:border-[#31415f] dark:bg-[#121a2d]/95 dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)]">
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[#223971] dark:text-[#edf3ff]">내 알림 현황</h2>
                    <p className="mt-1 text-[12px] text-[#7083b4] dark:text-[#98abd7]">관심 기업 발표를 놓치지 않도록</p>
                  </div>
                  <Sparkles className="mt-1 h-5 w-5 text-[#7090ea] dark:text-[#9db5ff]" />
                </div>

                <div className="mt-4 space-y-3">
                  {!isAuthChecked ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      알림 정보를 불러오는 중입니다.
                    </div>
                  ) : !isAuthenticated ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      로그인 후 맞춤 알림을 확인할 수 있어요.
                    </div>
                  ) : previewSubscriptions.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-[#d9e3ff] bg-white/84 px-4 py-5 text-[13px] text-[#7083b4] dark:border-[#31415f] dark:bg-[#16213a]/84 dark:text-[#98abd7]">
                      아직 등록된 알림 회사가 없습니다.
                    </div>
                  ) : (
                    previewSubscriptions.map((item) => {
                      const count = item.companyId == null ? 0 : (notificationsByCompanyId.get(item.companyId)?.length ?? 0)
                      return (
                        <Link
                          key={item.subscriptionId}
                          href="/notifications"
                          className={cn(
                            "block rounded-[18px] border px-4 py-3 shadow-[0_10px_22px_rgba(111,135,196,0.08)] transition-transform hover:-translate-y-0.5 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]",
                            count > 0
                              ? "border-[#d5e0ff] bg-[linear-gradient(180deg,#ffffff_0%,#edf4ff_100%)] dark:border-[#537ef5] dark:bg-[linear-gradient(180deg,#16213a_0%,#1c2946_100%)]"
                              : "border-[#e4eaff] bg-white/96 dark:border-[#31415f] dark:bg-[#16213a]/96",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#eef4ff_0%,#e7f2ff_100%)]">
                              <Bell className="h-4 w-4 text-[#5672ca] dark:text-[#bdd0ff]" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-bold text-[#1f366d] dark:text-[#edf3ff]">{item.companyName}</p>
                              <p className="mt-1 text-[12px] text-[#6f82b3] dark:text-[#98abd7]">
                                {count > 0 ? `새 알림 ${count}건이 도착했어요.` : "새로운 알림이 아직 없습니다."}
                              </p>
                            </div>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>

                <Link
                  href="/notifications"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#4d84ff_0%,#2a63e8_100%)] px-4 py-3 text-[14px] font-bold text-white shadow-[0_12px_28px_rgba(44,92,221,0.22)]"
                >
                  알림 설정하기
                </Link>
              </div>
            </article>
          </section>

          <section className="relative overflow-hidden rounded-[24px] border border-[#dfe6ff] bg-white/95 p-5 shadow-[0_18px_40px_rgba(97,118,177,0.1)] dark:border-[#31415f] dark:bg-[#121a2d]/95 dark:shadow-[0_22px_48px_rgba(0,0,0,0.34)]">
            <Image src="/design-previews/icon/panel-shape.png" alt="" fill className="object-cover opacity-55" />
            <div className="relative z-10">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-[22px] font-extrabold tracking-tight text-[#223971] dark:text-[#edf3ff]">서비스 바로가기</h2>
                  <p className="mt-1 text-[12px] text-[#7083b4] dark:text-[#98abd7]">탐색, 커뮤니티, 알림 기능을 빠르게 이동하세요.</p>
                </div>
                <p className="text-[12px] text-[#8b9dcc] dark:text-[#8fa3cf]">메인에서는 요약을 보고, 세부 화면에서 깊게 탐색합니다.</p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {reportBoards.map((card) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="group flex items-center gap-4 rounded-[18px] border border-[#e4eaff] bg-white/96 px-4 py-4 shadow-[0_10px_22px_rgba(111,135,196,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#d4e0ff] dark:border-[#31415f] dark:bg-[#16213a]/96 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)] dark:hover:border-[#49628f]"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#eff4ff_0%,#dfe9ff_100%)]">
                      <Image src={card.icon} alt="" width={54} height={54} className="h-auto w-[54px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-extrabold tracking-tight text-[#203872] dark:text-[#edf3ff]">{card.title}</p>
                      <p className="mt-1 text-[12px] text-[#6f82b3] dark:text-[#98abd7]">{card.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#89a0dc] dark:text-[#9db5ff] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
