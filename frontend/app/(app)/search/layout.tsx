import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { buildWebsiteJsonLd } from "@/lib/seo-metadata"

export const metadata: Metadata = {
  title: "회사 채용 일정 검색",
  description: "회사명을 검색해 채용 흐름과 발표 일정을 확인할 수 있는 내부 검색 페이지입니다.",
  robots: {
    index: true,
    follow: true,
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SeoJsonLd data={buildWebsiteJsonLd()} />
      {children}
    </>
  )
}
