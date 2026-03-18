"use client"

import { Suspense, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { loginWithGoogle } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { AppCard } from "@/components/app-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [embeddedBrowserName, setEmbeddedBrowserName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const showSessionExpired = searchParams.get("reason") === "session_expired"
  const showAuthRequired = searchParams.get("reason") === "auth_required"
  const showConsentDenied = searchParams.get("reason") === "consent_denied"
  const showOauthFailed = searchParams.get("reason") === "oauth_failed"
  const next = searchParams.get("next") ?? "/"

  useEffect(() => {
    if (typeof window === "undefined") return
    const userAgent = window.navigator.userAgent.toLowerCase()

    if (userAgent.includes("kakaotalk")) {
      setEmbeddedBrowserName("카카오톡")
      return
    }
    if (userAgent.includes("instagram")) {
      setEmbeddedBrowserName("인스타그램")
      return
    }
    if (userAgent.includes("fban") || userAgent.includes("fbav")) {
      setEmbeddedBrowserName("페이스북")
      return
    }
    if (userAgent.includes("line/")) {
      setEmbeddedBrowserName("라인")
      return
    }
    if (userAgent.includes("naver(inapp")) {
      setEmbeddedBrowserName("네이버")
      return
    }

    setEmbeddedBrowserName(null)
  }, [])

  const isBackBlockedPath = (path: string) => {
    const blockedPrefixes = ["/notifications", "/profile"]
    if (blockedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))) {
      return true
    }
    if (path === "/career-board/write" || path.startsWith("/career-board/write?")) return true
    if (path.includes("/write")) return true
    return false
  }

  const normalizeSafePath = (value: string | null | undefined) => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null
    if (trimmed === "/login" || trimmed.startsWith("/login?")) return null
    if ((showAuthRequired || showSessionExpired) && isBackBlockedPath(trimmed)) return null
    return trimmed
  }

  const handleGoBack = () => {
    const safeNext = normalizeSafePath(next)
    if (safeNext && safeNext !== "/") {
      router.push(safeNext)
      return
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      const referrerPath = (() => {
        try {
          if (!document.referrer) return null
          const parsed = new URL(document.referrer)
          if (parsed.origin !== window.location.origin) return null
          return `${parsed.pathname}${parsed.search}`
        } catch {
          return null
        }
      })()
      const safeReferrerPath = normalizeSafePath(referrerPath)
      if (safeReferrerPath) {
        router.push(safeReferrerPath)
        return
      }
    }
    router.push("/search")
  }

  const handleGoogleLogin = async () => {
    if (embeddedBrowserName) return
    setIsLoading(true)
    const shouldRoute = await loginWithGoogle(next)
    if (shouldRoute) {
      router.push("/")
    }
  }

  const handleCopyCurrentUrl = async () => {
    if (typeof window === "undefined") return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <AppCard className="text-center" gradient="blue">
          {showSessionExpired && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-center">
                <AlertTitle className="text-center">세션이 만료되었습니다</AlertTitle>
                <AlertDescription className="justify-items-center text-center">
                  다시 로그인해 주세요.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {showAuthRequired && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-center">
                <AlertTitle className="text-center">로그인이 필요합니다</AlertTitle>
                <AlertDescription className="justify-items-center text-center">
                  Google 계정으로 계속 진행해 주세요.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {showConsentDenied && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-center">
                <AlertTitle className="text-center">권한 동의가 필요합니다</AlertTitle>
                <AlertDescription className="justify-items-center text-center">
                  Google 필수 권한에 동의한 뒤 다시 시도해 주세요.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {showOauthFailed && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-center">
                <AlertTitle className="text-center">로그인에 실패했습니다</AlertTitle>
                <AlertDescription className="justify-items-center text-center">
                  잠시 후 다시 시도해 주세요.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {embeddedBrowserName && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-left">
                <AlertTitle>{embeddedBrowserName} 인앱 브라우저에서는 Google 로그인이 제한될 수 있습니다</AlertTitle>
                <AlertDescription className="mt-2 space-y-3 text-left">
                  <p>우측 상단 메뉴에서 Safari 또는 Chrome으로 연 뒤 다시 로그인해 주세요.</p>
                  <Button type="button" variant="outline" className="w-full rounded-xl" onClick={handleCopyCurrentUrl}>
                    {copied ? "현재 링크 복사됨" : "현재 링크 복사"}
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="mb-8 flex flex-col items-center">
            <Image src="/logo.png" alt="언제나와 로고" width={80} height={80} className="mb-4 rounded-2xl" priority />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">언제나와</h1>
            <p className="mt-2 text-muted-foreground">취업 전형 타임라인을 한눈에 확인하세요.</p>
          </div>

          <Button
            size="lg"
            className="w-full h-12 gap-3 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleGoogleLogin}
            disabled={isLoading || Boolean(embeddedBrowserName)}
          >
            {embeddedBrowserName ? "외부 브라우저에서 로그인해 주세요" : isLoading ? "로그인 중..." : "Google로 계속하기"}
          </Button>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={handleGoBack}
            >
              이전 페이지로 가기
            </Button>
            <Link
              href="/search"
              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
            >
              메인으로 가기
            </Link>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            계속 진행하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
          </p>
        </AppCard>
      </div>
    </div>
  )
}
