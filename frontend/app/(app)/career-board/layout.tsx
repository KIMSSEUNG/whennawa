import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "취업 고민 커뮤니티",
  description: "취업 준비 고민, 서류 팁, 면접 경험을 자유롭게 나누는 취업 커뮤니티 게시판입니다.",
  alternates: {
    canonical: "/career-board",
  },
}

export default function CareerBoardLayout({ children }: { children: React.ReactNode }) {
  return children
}
