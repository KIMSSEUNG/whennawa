import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { buildWebsiteJsonLd } from "@/lib/seo-metadata"

export const metadata: Metadata = {
  title: "기업 채용 일정 검색",
  description: "삼성전자, LG전자, 카카오 등 주요 기업의 서류 발표, 면접 일정, 채용 타임라인을 회사명으로 빠르게 검색해 확인하세요.",
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SeoJsonLd data={buildWebsiteJsonLd()} />
      {children}
    </>
  )
}
