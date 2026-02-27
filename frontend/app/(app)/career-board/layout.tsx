import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "취업 고민 게시판",
  description: "취업 고민을 자유롭게 공유하는 커뮤니티 게시판",
  alternates: {
    canonical: "/career-board",
  },
}

export default function CareerBoardLayout({ children }: { children: React.ReactNode }) {
  return children
}
