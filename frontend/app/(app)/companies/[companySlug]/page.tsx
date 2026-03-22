import { CompanySearchDetailPage } from "@/components/company-search-detail-page"
import { fromCompanySlug } from "@/lib/company-slug"

type CompanyDetailPageProps = {
  params: Promise<{ companySlug: string }>
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)

  return <CompanySearchDetailPage companyName={companyName} />
}
