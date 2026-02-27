"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { getUser } from "@/lib/api"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    const qs = searchParams?.toString()
    const nextPath = `${pathname ?? "/"}${qs ? `?${qs}` : ""}`
    const loginPath = `/login?reason=session_expired&next=${encodeURIComponent(nextPath)}`

    const checkSession = async () => {
      try {
        const user = await getUser()
        if (!user) {
          router.replace(loginPath)
        }
      } catch {
        router.replace(loginPath)
      }
    }

    checkSession()
  }, [pathname, router, searchParams])

  return <>{children}</>
}
