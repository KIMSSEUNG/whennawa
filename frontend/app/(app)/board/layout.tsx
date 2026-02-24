import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "취업 게시판",
  description: "회사별 게시판에서 취업 정보를 공유해 보세요.",
  alternates: {
    canonical: "/board",
  },
}

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return children
}
