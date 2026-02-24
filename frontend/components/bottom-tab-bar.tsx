"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { getUser } from "@/lib/api"

type Role = "USER" | "ADMIN" | null

const userTabs = [
  { href: "/search", label: "발표일 검색", icon: "검" },
  { href: "/board", label: "회사 게시판", icon: "판" },
  { href: "/career-board", label: "취업고민", icon: "고" },
  { href: "/notifications", label: "알림", icon: "알" },
  { href: "/profile", label: "프로필", icon: "프" },
]

const adminTabs = [
  { href: "/admin", label: "관리", icon: "관" },
  { href: "/profile", label: "프로필", icon: "프" },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const [role, setRole] = useState<Role>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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

  const tabs = (role === "ADMIN" ? adminTabs : userTabs).filter((tab) => {
    if (tab.href === "/profile") {
      return isAuthenticated && role === "USER"
    }
    return true
  })

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
      <div className="grid px-2 py-2 safe-bottom" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
              )}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
