"use client"

import { useState } from "react"
import { Suspense } from "react"
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const showSessionExpired = searchParams.get("reason") === "session_expired"
  const showAuthRequired = searchParams.get("reason") === "auth_required"
  const showConsentDenied = searchParams.get("reason") === "consent_denied"
  const showOauthFailed = searchParams.get("reason") === "oauth_failed"
  const next = searchParams.get("next") ?? "/"

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    const shouldRoute = await loginWithGoogle(next)
    if (shouldRoute) {
      router.push("/")
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <AppCard className="text-center" gradient="blue">
          {showSessionExpired && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-center">
                <AlertTitle className="text-center">Session expired</AlertTitle>
                <AlertDescription className="justify-items-center text-center">
                  Please log in again.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {showAuthRequired && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-center">
                <AlertTitle className="text-center">Login required</AlertTitle>
                <AlertDescription className="justify-items-center text-center">
                  Use your Google account to continue.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {showConsentDenied && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-center">
                <AlertTitle className="text-center">Consent required</AlertTitle>
                <AlertDescription className="justify-items-center text-center">
                  Please allow the required Google permissions and try again.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {showOauthFailed && (
            <div className="mb-6">
              <Alert variant="destructive" className="text-center">
                <AlertTitle className="text-center">Login failed</AlertTitle>
                <AlertDescription className="justify-items-center text-center">
                  Try again in a moment.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="mb-8 flex flex-col items-center">
            <Image src="/logo.png" alt="언제나와 로고" width={80} height={80} className="mb-4 rounded-2xl" priority />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">언제나와</h1>
            <p className="mt-2 text-muted-foreground">Track your job search timeline.</p>
          </div>

          <Button
            size="lg"
            className="w-full h-12 gap-3 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Continue with Google"}
          </Button>

          <Link
            href="/search"
            className="mt-4 inline-flex w-full items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            메인으로 가기
          </Link>

          <p className="mt-8 text-xs text-muted-foreground">
            By continuing, you agree to our terms and privacy policy.
          </p>
        </AppCard>
      </div>
    </div>
  )
}


