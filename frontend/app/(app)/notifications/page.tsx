"use client"

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  createCompany,
  createNotificationSubscription,
  deleteNotification,
  deleteNotificationSubscription,
  fetchNotifications,
  fetchNotificationSubscriptions,
  getUser,
  searchCompanies,
} from "@/lib/api"
import type { CompanySearchItem, NotificationSubscription, UserNotification } from "@/lib/types"
import { Input } from "@/components/ui/input"
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
import { normalizeCompanyName } from "@/lib/company-name"
import { cn } from "@/lib/utils"

const SUBSCRIPTION_PAGE_SIZE = 12
const NOTIFICATION_PAGE_SIZE = 12
const SUBSCRIPTION_VISIBLE_COUNT = 9

function formatDate(value: Date | null | undefined) {
  if (!value) return "-"
  return value.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function NotificationsPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<CompanySearchItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [addCompanyMessage, setAddCompanyMessage] = useState<string | null>(null)
  const [isCompanyRequestPopupOpen, setIsCompanyRequestPopupOpen] = useState(false)
  const [companyRequestPopupMessage, setCompanyRequestPopupMessage] = useState("")

  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([])
  const [subscriptionPage, setSubscriptionPage] = useState(0)
  const [subscriptionHasNext, setSubscriptionHasNext] = useState(false)
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false)

  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [notificationPage, setNotificationPage] = useState(0)
  const [notificationHasNext, setNotificationHasNext] = useState(false)
  const [isNotificationLoading, setIsNotificationLoading] = useState(false)
  const [isClearingAllNotifications, setIsClearingAllNotifications] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)

  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<NotificationSubscription | null>(null)
  const [subscriptionSlide, setSubscriptionSlide] = useState(0)
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<number>>(new Set())

  const trimmedQuery = useMemo(() => query.trim(), [query])
  const normalizedAddCompanyPreview = useMemo(() => normalizeCompanyName(newCompanyName), [newCompanyName])
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

  const sortedSubscriptions = useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      const aCount = a.companyId == null ? 0 : (notificationsByCompanyId.get(a.companyId)?.length ?? 0)
      const bCount = b.companyId == null ? 0 : (notificationsByCompanyId.get(b.companyId)?.length ?? 0)
      const aHas = aCount > 0 ? 1 : 0
      const bHas = bCount > 0 ? 1 : 0
      if (aHas !== bHas) return bHas - aHas
      return a.companyName.localeCompare(b.companyName, "ko-KR")
    })
  }, [subscriptions, notificationsByCompanyId])

  const maxSubscriptionSlide = useMemo(
    () => Math.max(0, Math.ceil(sortedSubscriptions.length / SUBSCRIPTION_VISIBLE_COUNT) - 1),
    [sortedSubscriptions.length],
  )

  const visibleSubscriptions = useMemo(() => {
    if (sortedSubscriptions.length <= SUBSCRIPTION_VISIBLE_COUNT) return sortedSubscriptions
    const start = subscriptionSlide * SUBSCRIPTION_VISIBLE_COUNT
    return sortedSubscriptions.slice(start, start + SUBSCRIPTION_VISIBLE_COUNT)
  }, [sortedSubscriptions, subscriptionSlide])

  const loadSubscriptions = async (targetPage: number, append: boolean) => {
    setIsSubscriptionLoading(true)
    try {
      const data = await fetchNotificationSubscriptions(targetPage, SUBSCRIPTION_PAGE_SIZE)
      setSubscriptions((prev) => (append ? [...prev, ...data.items] : data.items))
      setSubscriptionPage(data.page)
      setSubscriptionHasNext(data.hasNext)
    } finally {
      setIsSubscriptionLoading(false)
    }
  }

  const loadNotifications = async (targetPage: number, append: boolean) => {
    setIsNotificationLoading(true)
    try {
      const data = await fetchNotifications(targetPage, NOTIFICATION_PAGE_SIZE)
      setNotifications((prev) => (append ? [...prev, ...data.items] : data.items))
      setNotificationPage(data.page)
      setNotificationHasNext(data.hasNext)
    } finally {
      setIsNotificationLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const user = await getUser().catch(() => null)
      if (!mounted) return
      setIsAuthenticated(Boolean(user))
      setIsAuthChecked(true)
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    void loadSubscriptions(0, false)
    void loadNotifications(0, false)
  }, [isAuthenticated])

  useEffect(() => {
    if (!trimmedQuery || !showSuggestions) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await searchCompanies(trimmedQuery, 6)
      if (cancelled) return
      setSuggestions(data ?? [])
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [trimmedQuery, showSuggestions])

  const handleAdd = async (companyNameOverride?: string) => {
    if (!isAuthenticated) {
      setShowSuggestions(false)
      setSuggestions([])
      setActionMessage("로그인 후 이용해 주세요.")
      return
    }

    const companyName = (companyNameOverride ?? query).trim()
    if (!companyName) return

    setIsAdding(true)
    setActionMessage(null)
    try {
      let resolvedCompanyName = companyName
      const exactFromSuggestions = suggestions.find(
        (item) => item.companyName?.trim().toLowerCase() === companyName.toLowerCase(),
      )
      if (exactFromSuggestions?.companyName) {
        resolvedCompanyName = exactFromSuggestions.companyName
      } else {
        const related = await searchCompanies(companyName, 10)
        const exact = (related ?? []).find(
          (item) => item.companyName?.trim().toLowerCase() === companyName.toLowerCase(),
        )
        if (!exact?.companyName) {
          setActionMessage("등록된 회사만 알림 등록이 가능합니다. 회사 추가를 먼저 진행해 주세요.")
          return
        }
        resolvedCompanyName = exact.companyName
      }

      await createNotificationSubscription(resolvedCompanyName)
      setQuery("")
      setSuggestions([])
      setShowSuggestions(false)
      setActionMessage(`"${resolvedCompanyName}" 알림이 등록되었습니다.`)
      await loadSubscriptions(0, false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "알림 등록에 실패했습니다."
      setActionMessage(message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddSubscriptionSubmit = (event: FormEvent) => {
    event.preventDefault()
    void handleAdd()
  }

  const handleAddCompany = async (event: FormEvent) => {
    event.preventDefault()
    if (!newCompanyName.trim()) return
    setIsAddingCompany(true)
    setAddCompanyMessage(null)
    try {
      const result = await createCompany(newCompanyName)
      if (result.pending) {
        const message = result.message ?? "회사 등록 요청 감사합니다. 처리에는 일정 시간이 소요될 수 있습니다."
        setAddCompanyMessage(null)
        setShowSuggestions(false)
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
      setShowSuggestions(true)
    } catch (error) {
      const text = error instanceof Error ? error.message : "회사 추가에 실패했습니다."
      setAddCompanyMessage(text)
    } finally {
      setIsAddingCompany(false)
    }
  }

  const handleRemoveSubscription = async (subscriptionId: number) => {
    if (!isAuthenticated) return
    await deleteNotificationSubscription(subscriptionId)
    await loadSubscriptions(0, false)
  }

  const handleDeleteNotification = async (notificationId: number) => {
    if (!isAuthenticated) return
    await deleteNotification(notificationId)
    await loadNotifications(0, false)
  }

  const handleClearAllNotifications = async () => {
    if (!isAuthenticated || isClearingAllNotifications) return
    setIsClearingAllNotifications(true)
    try {
      const ids = new Set<number>()
      let page = 0
      while (true) {
        const data = await fetchNotifications(page, NOTIFICATION_PAGE_SIZE)
        for (const item of data.items ?? []) ids.add(item.notificationId)
        if (!data.hasNext) break
        page += 1
      }

      for (const notificationId of ids) {
        await deleteNotification(notificationId)
      }

      await loadNotifications(0, false)
      await loadSubscriptions(0, false)
    } finally {
      setIsClearingAllNotifications(false)
    }
  }

  const toggleMessageExpanded = (notificationId: number) => {
    setExpandedMessageIds((prev) => {
      const next = new Set(prev)
      if (next.has(notificationId)) {
        next.delete(notificationId)
      } else {
        next.add(notificationId)
      }
      return next
    })
  }

  const selectedCompanyNotifications = useMemo(() => {
    if (!selectedSubscription?.companyId) return []
    return notificationsByCompanyId.get(selectedSubscription.companyId) ?? []
  }, [selectedSubscription, notificationsByCompanyId])

  const handleClearAllSelectedCompanyNotifications = async () => {
    if (!isAuthenticated || selectedCompanyNotifications.length === 0) return
    setIsClearingAll(true)
    try {
      await Promise.all(selectedCompanyNotifications.map((item) => deleteNotification(item.notificationId)))
      await loadNotifications(0, false)
    } finally {
      setIsClearingAll(false)
    }
  }

  useEffect(() => {
    setSubscriptionSlide((prev) => Math.min(prev, maxSubscriptionSlide))
  }, [maxSubscriptionSlide])

  const loginPath = (() => {
    const qs = searchParams?.toString()
    const next = `${pathname ?? "/notifications"}${qs ? `?${qs}` : ""}`
    return `/login?reason=auth_required&next=${encodeURIComponent(next)}`
  })()

  return (
    <div className="page-shell [--page-max:1520px] space-y-6 py-6">
      <section className="rounded-3xl border border-border/60 bg-card p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notifications</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">회사 발표 알림</h1>
        <p className="mt-1 text-base font-semibold text-muted-foreground md:text-lg">
          누군가 등록 회사의 <span className="font-extrabold text-primary">오늘 결과 발표가 났어요</span> 버튼으로 제보 시 알림이 와요.
        </p>

        <form className="mt-5 flex flex-wrap gap-2" onSubmit={handleAddSubscriptionSubmit}>
          <div className="relative w-full min-w-0 flex-1">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="알림 받을 회사명"
              className="h-12 rounded-xl"
            />
            {showSuggestions && trimmedQuery && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-border/70 bg-card p-2 shadow-lg">
                {suggestions.map((item) => (
                  <button
                    key={`notification-suggest-${item.companyName}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void handleAdd(item.companyName)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent/60"
                  >
                    {item.companyName}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            type="submit"
            className="h-12 px-6"
            disabled={isAdding || !trimmedQuery || !isAuthenticated}
          >
            {isAdding ? "등록 중..." : "알림 등록"}
          </Button>
          <Button type="button" variant="outline" className="h-12 px-6" onClick={() => setIsAddCompanyOpen(true)}>
            회사 추가
          </Button>
        </form>
        {actionMessage && <p className="mt-3 text-sm text-muted-foreground">{actionMessage}</p>}
      </section>

      <div className={cn("relative", !isAuthenticated && isAuthChecked ? "overflow-hidden" : "") }>
        {!isAuthenticated && isAuthChecked && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-[2px] touch-none select-none">
            <div className="mx-4 w-full max-w-xl border border-border/70 bg-card p-5 text-center shadow-lg">
              <h3 className="text-base font-semibold text-foreground">로그인 후 이용해 주세요.</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                알림 등록과 수신 확인은 로그인 사용자만 가능합니다.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button type="button" onClick={() => router.push(loginPath)}>
                  로그인하러 가기
                </Button>
              </div>
            </div>
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">등록한 회사</h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleClearAllNotifications()}
                disabled={!isAuthenticated || isClearingAllNotifications}
              >
                {isClearingAllNotifications ? "처리 중..." : "알림 다 읽기"}
              </Button>
              {sortedSubscriptions.length > SUBSCRIPTION_VISIBLE_COUNT && (
                <>
                  <button
                    type="button"
                    onClick={() => setSubscriptionSlide((prev) => Math.max(0, prev - 1))}
                    disabled={subscriptionSlide === 0}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-foreground disabled:opacity-40"
                    aria-label="이전 카드"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriptionSlide((prev) => Math.min(maxSubscriptionSlide, prev + 1))}
                    disabled={subscriptionSlide >= maxSubscriptionSlide}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-foreground disabled:opacity-40"
                    aria-label="다음 카드"
                  >
                    →
                  </button>
                </>
              )}
              <span className="text-xs text-muted-foreground">{sortedSubscriptions.length}개</span>
            </div>
          </div>
          {sortedSubscriptions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-6 text-sm text-muted-foreground">
              등록한 회사가 없습니다.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleSubscriptions.map((item) => (
                <button
                  key={item.subscriptionId}
                  type="button"
                  onClick={() => setSelectedSubscription(item)}
                  className={cn(
                    "group w-full min-h-[172px] rounded-2xl border-4 p-5 text-left transition-all",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    (item.companyId != null && (notificationsByCompanyId.get(item.companyId)?.length ?? 0) > 0)
                      ? "border-emerald-400/80 bg-card hover:border-emerald-500/90"
                      : "border-slate-300/80 bg-card hover:border-slate-400/80",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-base font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      {item.companyName.charAt(0)}
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleRemoveSubscription(item.subscriptionId)
                      }}
                      className="inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    >
                      삭제
                    </button>
                  </div>
                  <p className="mt-3 break-words font-semibold text-foreground">{item.companyName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">등록일 {formatDate(item.createdAt)}</p>
                  <p className="mt-2 inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {(item.companyId != null && (notificationsByCompanyId.get(item.companyId)?.length ?? 0) > 0)
                      ? `알림 ${(notificationsByCompanyId.get(item.companyId)?.length ?? 0)}건`
                      : "알림 없음"}
                  </p>
                </button>
              ))}
            </div>
          )}
          {subscriptionHasNext && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadSubscriptions(subscriptionPage + 1, true)}
              disabled={isSubscriptionLoading}
            >
              {isSubscriptionLoading ? "불러오는 중..." : "더보기"}
            </Button>
          )}
        </section>
      </div>

      <Dialog open={Boolean(selectedSubscription)} onOpenChange={(open) => !open && setSelectedSubscription(null)}>
        <DialogContent className="w-[min(96vw,1240px)] max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedSubscription?.companyName ?? "-"} 알림</DialogTitle>
            <div className="flex items-center justify-between gap-3">
              <DialogDescription className="m-0 text-left">
                등록 회사의 최근 알림을 확인할 수 있어요.
              </DialogDescription>
              {selectedCompanyNotifications.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleClearAllSelectedCompanyNotifications()}
                  disabled={isClearingAll}
                  className="h-8 whitespace-nowrap"
                >
                  {isClearingAll ? "처리 중..." : "전체 읽음"}
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedCompanyNotifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
              아직 받은 알림이 없습니다.
            </div>
          ) : (
            <div className="max-h-[52vh] space-y-3 overflow-auto pr-1">
              {selectedCompanyNotifications.map((item) => (
                <div key={item.notificationId} className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-foreground">{item.summaryText}</p>
                      {item.reporterMessage && (() => {
                        const message = item.reporterMessage
                        const isLong = message.length > 50
                        const isExpanded = expandedMessageIds.has(item.notificationId)
                        const visibleMessage = isLong && !isExpanded ? `${message.slice(0, 50)}...` : message
                        return (
                          <div className="mt-2">
                            <p className="break-words rounded-md bg-muted/50 px-2.5 py-2 text-sm text-muted-foreground">
                              메시지: {visibleMessage}
                            </p>
                            {isLong && (
                              <button
                                type="button"
                                onClick={() => toggleMessageExpanded(item.notificationId)}
                                className="mt-1 text-xs font-semibold text-primary hover:underline"
                              >
                                {isExpanded ? "접기" : "더보기"}
                              </button>
                            )}
                          </div>
                        )
                      })()}
                      <p className="mt-2 text-xs text-muted-foreground">
                        기준일 {formatDate(item.eventDate)} | 제보 {item.reporterCount}건
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteNotification(item.notificationId)}
                      className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    >
                      읽음
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {notificationHasNext && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadNotifications(notificationPage + 1, true)}
              disabled={isNotificationLoading}
            >
              {isNotificationLoading ? "알림 불러오는 중..." : "알림 더 불러오기"}
            </Button>
          )}
        </DialogContent>
      </Dialog>

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
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell [--page-max:1520px] py-6 text-sm text-muted-foreground">
          불러오는 중...
        </div>
      }
    >
      <NotificationsPageClient />
    </Suspense>
  )
}
