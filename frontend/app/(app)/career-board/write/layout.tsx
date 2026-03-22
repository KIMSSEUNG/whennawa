import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "취업 고민 글쓰기",
  robots: {
    index: false,
    follow: false,
  },
}

export default function CareerBoardWriteLayout({ children }: { children: React.ReactNode }) {
  return children
}
