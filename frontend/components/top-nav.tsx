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
  { href: "/profile", label: "프로필" },
]

const adminNavItems = [
  { href: "/admin", label: "타임라인" },
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
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-6">
      <div className="flex items-center gap-8">
        <Link href="/search" className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Image src="/logo.png" alt="언제나와 로고" width={28} height={28} className="rounded-md" priority />
          <span>언제나와</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm rounded-lg transition-colors",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
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
              "text-sm px-3 py-1.5 rounded-lg border border-border/60",
              "text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50",
            )}
          >
            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
          </button>
        ) : (
          <Link
            href={loginHref}
            className="text-sm px-3 py-1.5 rounded-lg border border-border/60 text-foreground hover:bg-muted/50 transition-colors"
          >
            로그인
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
