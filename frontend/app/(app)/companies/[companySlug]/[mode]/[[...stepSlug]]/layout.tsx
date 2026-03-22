import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { buildCompanyDetailJsonLd, buildCompanyDetailMetadata } from "@/lib/company-page-seo"
import { fromModeSlug, fromStepSlug, getCompanyNameFromDetailSlug } from "@/lib/company-detail-route"

type CompanyDetailModeLayoutProps = {
  children: React.ReactNode
  params: Promise<{ companySlug: string; mode: string; stepSlug?: string[] }>
}

export async function generateMetadata({ params }: CompanyDetailModeLayoutProps): Promise<Metadata> {
  const { companySlug, mode, stepSlug } = await params
  const companyName = getCompanyNameFromDetailSlug(companySlug)
  const initialMode = fromModeSlug(mode)
  const initialStep = fromStepSlug(stepSlug?.[0])
  const path = initialStep
    ? `/companies/${companySlug}/${mode}/${encodeURIComponent(initialStep)}`
    : `/companies/${companySlug}/${mode}`

  return buildCompanyDetailMetadata(companyName, path, {
    mode: initialMode,
    stepName: initialStep || null,
  })
}

export default async function CompanyDetailModeLayout({ children, params }: CompanyDetailModeLayoutProps) {
  const { companySlug, mode, stepSlug } = await params
  const companyName = getCompanyNameFromDetailSlug(companySlug)
  const initialMode = fromModeSlug(mode)
  const initialStep = fromStepSlug(stepSlug?.[0])
  const path = initialStep
    ? `/companies/${companySlug}/${mode}/${encodeURIComponent(initialStep)}`
    : `/companies/${companySlug}/${mode}`

  return (
    <>
      <SeoJsonLd
        data={buildCompanyDetailJsonLd(companyName, path, {
          mode: initialMode,
          stepName: initialStep || null,
        })}
      />
      {children}
    </>
  )
}
