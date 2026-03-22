import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "게시글 작성",
  robots: {
    index: false,
    follow: false,
  },
}

export default function CompanyBoardWriteLayout({ children }: { children: React.ReactNode }) {
  return children
}
