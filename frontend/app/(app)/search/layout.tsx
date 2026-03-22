import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { buildWebsiteJsonLd } from "@/lib/seo-metadata"

export const metadata: Metadata = {
  title: "회사 검색",
  description: "회사명을 검색하고 채용 전형 타임라인을 확인하세요.",
  alternates: {
    canonical: "/search",
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

