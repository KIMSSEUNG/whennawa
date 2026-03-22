import { CompanySearchDetailPage } from "@/components/company-search-detail-page"
import { fromModeSlug, fromStepSlug, getCompanyNameFromDetailSlug } from "@/lib/company-detail-route"

type CompanyDetailModePageProps = {
  params: Promise<{ companySlug: string; mode: string; stepSlug?: string[] }>
}

export default async function CompanyDetailModePage({ params }: CompanyDetailModePageProps) {
  const { companySlug, mode, stepSlug } = await params
  const companyName = getCompanyNameFromDetailSlug(companySlug)
  const initialMode = fromModeSlug(mode)
  const initialStep = fromStepSlug(stepSlug?.[0])

  return <CompanySearchDetailPage companyName={companyName} initialMode={initialMode} initialStep={initialStep || null} />
}
