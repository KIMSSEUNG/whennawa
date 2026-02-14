"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { getUser, logout, withdraw } from "@/lib/api"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AppCard } from "@/components/app-card"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    async function loadUser() {
      const data = await getUser()
      if (!mounted) return
      if (!data || data.role !== "USER") {
        router.push("/login")
        return
      }
      setUser(data)
      setIsLoading(false)
    }

    const handleSessionUpdate = () => {
      loadUser()
    }

    loadUser()
    window.addEventListener("session_update", handleSessionUpdate)
    window.addEventListener("storage", handleSessionUpdate)
    return () => {
      mounted = false
      window.removeEventListener("session_update", handleSessionUpdate)
      window.removeEventListener("storage", handleSessionUpdate)
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    router.push("/login")
  }

  const handleWithdraw = async () => {
    setIsWithdrawing(true)
    await withdraw()
    router.push("/login")
  }

  const settingsItems = [
    { label: "알림 설정", description: "알림과 리마인더를 관리합니다." },
    { label: "개인 정보", description: "프로필 정보를 수정합니다." },
    { label: "고객센터", description: "자주 묻는 질문을 확인합니다." },
  ]

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header - mobile only */}
      <header className="mb-6 flex items-start justify-between md:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="언제나와 로고" width={24} height={24} className="rounded-md" priority />
            <span className="text-base font-semibold text-foreground">언제나와</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">프로필</h1>
          <p className="text-sm text-muted-foreground">계정 설정</p>
        </div>
        <ThemeToggle />
      </header>

      {/* User Card */}
      <AppCard className="mb-4" gradient="blue">
        <div className="flex items-center gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-200 to-indigo-200 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {user?.name?.charAt(0) ?? "U"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-foreground">{user?.name}</h2>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </>
          )}
        </div>
      </AppCard>

      {/* Theme Toggle Card - Desktop */}
      <AppCard className="mb-4 hidden md:block">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">테마</p>
            <p className="text-sm text-muted-foreground">라이트 또는 다크 모드를 선택하세요.</p>
          </div>
          <ThemeToggle />
        </div>
      </AppCard>

      {/* Settings */}
      <AppCard className="mb-4 p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">설정</h3>
        </div>
        <div className="divide-y divide-border">
          {settingsItems.map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/50 active:bg-accent"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <span className="text-muted-foreground"></span>
            </button>
          ))}
        </div>
      </AppCard>

      {/* PWA Install Hint */}
      <AppCard className="mb-4" gradient="blue">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">앱 설치</p>
            <p className="text-sm text-muted-foreground">홈 화면에 추가해 빠르게 접근하세요.</p>
          </div>
          <span className="text-sm text-muted-foreground">PWA</span>
        </div>
      </AppCard>

      {/* Logout Button */}
      <Button
        variant="outline"
        className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </Button>

      <Button
        variant="destructive"
        className="mt-3 w-full h-12 rounded-xl"
        onClick={() => setIsWithdrawOpen(true)}
        disabled={isWithdrawing}
      >
        회원 탈퇴
      </Button>

      {/* App Version */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        언제나와 v1.0.0
      </p>

      <AlertDialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>회원 탈퇴</AlertDialogTitle>
            <AlertDialogDescription>
              회원 탈퇴 시 계정 정보는 복구할 수 없으며, 모든 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWithdrawing}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isWithdrawing}
              onClick={handleWithdraw}
            >
              회원 탈퇴 진행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}



