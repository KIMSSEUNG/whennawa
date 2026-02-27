"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bell, Briefcase, Building2, MessageSquareText, SearchCheck } from "lucide-react"
import { fetchNotifications, fetchNotificationSubscriptions, getUser } from "@/lib/api"
import type { NotificationSubscription, UserNotification } from "@/lib/types"
import { cn } from "@/lib/utils"

const quickActions = [
  {
    href: "/search",
    title: "발표일 검색",
    description: "회사별 발표 흐름과 전형 기록을 빠르게 확인",
    icon: SearchCheck,
  },
  {
    href: "/board",
    title: "회사별 게시판",
    description: "기업별 정보와 후기를 모아서 확인",
    icon: Building2,
  },
  {
    href: "/career-board",
    title: "취업고민 게시판",
    description: "이력서/면접/오퍼 고민을 익명으로 공유",
    icon: MessageSquareText,
  },
]

export default function HomePage() {
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([])
  const [notifications, setNotifications] = useState<UserNotification[]>([])

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
    return sorted.slice(0, 3)
  }, [subscriptions, notificationsByCompanyId])

  return (
    <div className="container mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-background to-sky-500/10 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">When Nawa Home</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
          취업 정보, 제보, 커뮤니티를
          <br className="hidden md:block" />한 화면에서 시작하세요
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">
          발표일 검색, 회사별 게시판, 취업고민 게시판, 알림 기능을 연결해
          지원자 관점의 실제 흐름으로 빠르게 확인할 수 있습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
        <Link
          href="/notifications"
          className="inline-flex w-auto max-w-[180px] items-center gap-1 rounded-xl border border-primary/30 bg-background/80 px-3 py-2.5 hover:bg-background"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-primary" />
            <p className="truncate text-sm font-semibold text-foreground md:text-base">알림 관리</p>
          </div>
        </Link>

        <div className="mt-3 rounded-xl border border-border/60 bg-card p-3">
          {!isAuthChecked ? (
            <p className="text-sm text-muted-foreground">알림 정보를 불러오는 중...</p>
          ) : !isAuthenticated ? (
            <p className="text-sm font-medium text-muted-foreground">로그인 시 알림 사용 가능합니다.</p>
          ) : previewSubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 알림 회사가 없습니다.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-3">
              {previewSubscriptions.map((item) => {
                const count = item.companyId == null ? 0 : (notificationsByCompanyId.get(item.companyId)?.length ?? 0)
                return (
                  <Link
                    key={item.subscriptionId}
                    href="/notifications"
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm hover:bg-muted/40",
                      count > 0 ? "border-emerald-300 bg-emerald-50/60" : "border-border/70 bg-background",
                    )}
                  >
                    <p className="truncate font-semibold text-foreground">{item.companyName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{count > 0 ? `알림 ${count}건` : "알림 없음"}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2">
          <h3 className="text-lg font-bold text-foreground">추천 이용</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/search"
              className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm hover:bg-muted/40"
            >
              <p className="font-semibold text-foreground">1. 발표일 검색</p>
              <p className="mt-1 text-muted-foreground">회사 검색 후 현재 전형/이전 전형 데이터 확인</p>
            </Link>
            <Link
              href="/board"
              className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm hover:bg-muted/40"
            >
              <p className="font-semibold text-foreground">2. 회사별 게시판</p>
              <p className="mt-1 text-muted-foreground">실제 지원자 글/댓글/대댓글 확인</p>
            </Link>
            <Link
              href="/career-board"
              className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm hover:bg-muted/40"
            >
              <p className="font-semibold text-foreground">3. 취업고민 공유</p>
              <p className="mt-1 text-muted-foreground">진로/전형 고민을 별도 게시판에서 공유</p>
            </Link>
            <Link
              href="/notifications"
              className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm hover:bg-muted/40"
            >
              <p className="font-semibold text-foreground">4. 알림 등록</p>
              <p className="mt-1 text-muted-foreground">오늘 결과 발표 제보 알림을 회사 단위로 수신</p>
            </Link>
          </div>
        </article>

        <aside className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 text-foreground">
            <Briefcase className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">빠른 진입</h3>
          </div>
          <div className="mt-4 space-y-2">
            <Link href="/search" className="block rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40">
              발표일 검색
            </Link>
            <Link href="/board" className="block rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40">
              회사별 게시판
            </Link>
            <Link href="/career-board" className="block rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40">
              취업고민 게시판
            </Link>
            <Link href="/notifications" className="block rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/40">
              알림 관리
            </Link>
          </div>
        </aside>
      </section>
    </div>
  )
}
