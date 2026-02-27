import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "\uB85C\uADF8\uC778 | \uC5B8\uC81C\uB098\uC640",
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
