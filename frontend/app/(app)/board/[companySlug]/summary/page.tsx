"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useParams } from "next/navigation"
import { fromCompanySlug } from "@/lib/company-slug"
import { CompanySummarySection } from "@/components/company-summary-section"
import { boardTheme } from "@/lib/board-theme"
import { Button } from "@/components/ui/button"

export default function CompanyBoardSummaryPage() {
  const params = useParams<{ companySlug: string }>()
  const companySlug = params?.companySlug ?? ""
  const companyName = useMemo(() => fromCompanySlug(companySlug), [companySlug])

  return (
    <div className="page-shell [--page-max:1280px] space-y-6 py-6">
      <section className={boardTheme.heroSection}>
        <div className={boardTheme.heroTopLine} />
        <div className={boardTheme.heroGlowRight} />
        <div className={boardTheme.heroGlowLeft} />
        <div className="relative">
          <p className={boardTheme.heroEyebrow}>Board Summary</p>
          <h1 className={boardTheme.heroTitle}>{companyName}</h1>
          <p className={boardTheme.heroDescription}>
            {companyName}의 공채, 인턴, 수시 전형에서 등록된 발표 일자 평균을 전형별로 확인해 보세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/board/${companySlug}`}>
              <Button type="button" className={`h-10 ${boardTheme.solidButton}`}>게시판으로 돌아가기</Button>
            </Link>
            <Link href={`/search?company=${encodeURIComponent(companyName)}`}>
              <Button type="button" variant="outline" className={`h-10 ${boardTheme.outlineButton}`}>회사 상세 검색</Button>
            </Link>
          </div>
        </div>
      </section>

      <CompanySummarySection companyName={companyName} />
    </div>
  )
}
