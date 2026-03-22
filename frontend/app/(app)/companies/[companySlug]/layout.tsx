import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { getCompanyNameFromDetailSlug } from "@/lib/company-detail-route"
import { buildCompanyDetailJsonLd, buildCompanyDetailMetadata } from "@/lib/company-page-seo"

type CompanyDetailLayoutProps = {
  children: React.ReactNode
  params: Promise<{ companySlug: string }>
}

export async function generateMetadata({ params }: CompanyDetailLayoutProps): Promise<Metadata> {
  const { companySlug } = await params
  const companyName = getCompanyNameFromDetailSlug(companySlug)
  return buildCompanyDetailMetadata(companyName, `/companies/${companySlug}`)
}

export default async function CompanyDetailLayout({ children, params }: CompanyDetailLayoutProps) {
  const { companySlug } = await params
  const companyName = getCompanyNameFromDetailSlug(companySlug)

  return (
    <>
      <SeoJsonLd data={buildCompanyDetailJsonLd(companyName, `/companies/${companySlug}`)} />
      {children}
    </>
  )
}
