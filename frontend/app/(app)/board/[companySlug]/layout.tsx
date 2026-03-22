import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { fromCompanySlug } from "@/lib/company-slug"
import { buildBoardCollectionJsonLd, buildBoardCollectionMetadata } from "@/lib/seo-metadata"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ companySlug: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)

  return buildBoardCollectionMetadata(companyName, `/board/${companySlug}`)
}

export default async function CompanyBoardLayout({ children, params }: LayoutProps) {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)

  return (
    <>
      <SeoJsonLd data={buildBoardCollectionJsonLd(companyName, `/board/${companySlug}`)} />
      {children}
    </>
  )
}
