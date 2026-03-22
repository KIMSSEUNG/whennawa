import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { fromCompanySlug } from "@/lib/company-slug"
import { buildCompanySummaryJsonLd, buildCompanySummaryMetadata } from "@/lib/company-summary-seo"

type SummaryLayoutProps = {
  children: React.ReactNode
  params: Promise<{ companySlug: string }>
}

export async function generateMetadata({ params }: SummaryLayoutProps): Promise<Metadata> {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)
  return buildCompanySummaryMetadata(companyName, `/board/${companySlug}/summary`)
}

export default async function SummaryLayout({ children, params }: SummaryLayoutProps) {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)

  return (
    <>
      <SeoJsonLd data={buildCompanySummaryJsonLd(companyName, `/board/${companySlug}/summary`)} />
      {children}
    </>
  )
}
