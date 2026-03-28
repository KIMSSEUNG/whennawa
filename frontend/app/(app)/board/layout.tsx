import type { Metadata } from "next"
import type React from "react"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "기업별 채용 후기 게시판",
  description: "기업별 채용 후기, 면접 경험, 지원 팁을 회사 게시판에서 모아 확인하세요.",
  alternates: {
    canonical: "/board",
  },
}

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  void children
  redirect("/search")
}
