"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Building2, MessageSquareText, SearchCheck, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { getUser } from "@/lib/api"

type Role = "USER" | "ADMIN" | null

const userTabs = [
  { href: "/search", label: "발표 검색", icon: SearchCheck },
  { href: "/board", label: "회사 게시판", icon: Building2 },
  { href: "/career-board", label: "취업 고민", icon: MessageSquareText },
  { href: "/notifications", label: "알림", icon: Bell },
  { href: "/profile", label: "프로필", icon: UserRound },
]

const adminTabs = [
  { href: "/admin/reports", label: "공고 검수", icon: SearchCheck },
  { href: "/admin/company-requests", label: "회사 검수", icon: Building2 },
  { href: "/profile", label: "프로필", icon: UserRound },
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
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="mx-auto mb-2 w-[calc(100%-20px)] max-w-[460px] rounded-[26px] border border-[#dce4ff] bg-[linear-gradient(180deg,rgba(53,98,224,0.96)_0%,rgba(37,81,199,0.98)_100%)] px-2 py-2 shadow-[0_20px_40px_rgba(47,83,186,0.28)] backdrop-blur-sm dark:border-[#31415f] dark:bg-[linear-gradient(180deg,rgba(18,28,49,0.94)_0%,rgba(13,21,39,0.98)_100%)] dark:shadow-[0_22px_44px_rgba(0,0,0,0.38)]">
        <div className="grid safe-bottom" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-white/16 text-white dark:bg-[#233355] dark:text-[#e8efff]"
                    : "text-white/74 hover:bg-white/10 hover:text-white dark:text-[#99a9cf] dark:hover:bg-[#1c2946] dark:hover:text-[#e8efff]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
