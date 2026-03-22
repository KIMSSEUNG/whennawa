import type React from "react"
import { Suspense } from "react"
import { BottomTabBar } from "@/components/bottom-tab-bar"
import { ThemeToggle } from "@/components/theme-toggle"
import { TopNav } from "@/components/top-nav"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <TopNav />
      </Suspense>
      <div className="fixed right-3 top-3 z-50 md:hidden">
        <div className="shell-panel rounded-full border p-1">
          <ThemeToggle />
        </div>
      </div>
      <main className="flex-1 pb-20 md:pb-8 md:pt-14">{children}</main>
      <BottomTabBar />
    </div>
  )
}
