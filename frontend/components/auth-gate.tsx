"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getUser } from "@/lib/api"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    const checkSession = async () => {
      try {
        const user = await getUser()
        if (!user) {
          router.replace("/login?reason=session_expired")
        }
      } catch {
        router.replace("/login?reason=session_expired")
      }
    }

    checkSession()
  }, [router])

  return <>{children}</>
}
