"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { getUser, logout } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"

const userNavItems = [
  { href: "/search", label: "발표일 검색" },
  { href: "/board", label: "회사별 게시판" },
  { href: "/career-board", label: "취업고민" },
  { href: "/notifications", label: "알림" },
  { href: "/profile", label: "프로필" },
]

const adminNavItems = [
  { href: "/admin/reports", label: "공고 제보 검수" },
  { href: "/admin/company-requests", label: "회사 추가 검수" },
  { href: "/profile", label: "프로필" },
]

export function TopNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [role, setRole] = useState<"USER" | "ADMIN" | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let mounted = true
    const loadRole = async () => {
      try {
        const user = await getUser()
        if (!mounted) return
        if (!user) {
          setRole(null)
          setIsAuthenticated(false)
          return
        }
        setRole(user.role ?? "USER")
        setIsAuthenticated(true)
      } catch {
        if (!mounted) return
        setRole(null)
        setIsAuthenticated(false)
      }
    }

    const handleSessionUpdate = () => {
      loadRole()
    }

    loadRole()
    window.addEventListener("session_update", handleSessionUpdate)
    window.addEventListener("storage", handleSessionUpdate)
    return () => {
      mounted = false
      window.removeEventListener("session_update", handleSessionUpdate)
      window.removeEventListener("storage", handleSessionUpdate)
    }
  }, [])

  const navItems = (role === "ADMIN" ? adminNavItems : userNavItems).filter((item) => {
    if (item.href === "/profile") {
      return isAuthenticated && role === "USER"
    }
    return true
  })

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setRole(null)
      setIsAuthenticated(false)
      setIsLoggingOut(false)
      const qs = searchParams?.toString()
      const nextPath = `${pathname ?? "/"}${qs ? `?${qs}` : ""}`
      router.push(`/login?next=${encodeURIComponent(nextPath)}`)
    }
  }
  const qs = searchParams?.toString()
  const loginHref = `/login?next=${encodeURIComponent(`${pathname ?? "/"}${qs ? `?${qs}` : ""}`)}`

  return (
    <header className="fixed left-0 right-0 top-0 z-50 hidden border-b border-[#dfe6ff] bg-[rgba(248,250,255,0.84)] backdrop-blur-xl md:block">
      <div className="flex h-16 items-center justify-between gap-6 px-6 xl:px-10">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 text-lg font-bold text-foreground">
            <Image src="/logo.png" alt="언제나와 로고" width={32} height={32} className="rounded-xl" priority />
            <div className="flex flex-col">
              <span className="text-[17px] font-black tracking-tight text-[#21386f]">언제나와</span>
              <span className="text-[11px] font-medium text-[#7a8fbf]">Hiring signal dashboard</span>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                "rounded-full border border-[#dce4ff] bg-white/80 px-4 py-2 text-sm font-semibold text-[#2a4078] shadow-[0_8px_16px_rgba(112,136,198,0.08)] transition-colors hover:bg-[#f4f7ff] disabled:opacity-50",
              )}
            >
              {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
            </button>
          ) : (
            <Link
              href={loginHref}
              className="rounded-full border border-[#dce4ff] bg-white/80 px-4 py-2 text-sm font-semibold text-[#2a4078] shadow-[0_8px_16px_rgba(112,136,198,0.08)] transition-colors hover:bg-[#f4f7ff]"
            >
              로그인
            </Link>
          )}
          <div className="rounded-full border border-[#dce4ff] bg-white/80 p-1 shadow-[0_8px_16px_rgba(112,136,198,0.08)]">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
