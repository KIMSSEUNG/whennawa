import type { Metadata } from "next"
import Link from "next/link"
import { fromCompanySlug } from "@/lib/company-slug"
import { getSiteUrl } from "@/lib/seo"

type TimelineStep = {
  label: string
  occurredAt: string | null
  diffDays?: number | null
}

type TimelineUnit = {
  year: number
  steps: TimelineStep[]
}

type RollingStep = {
  stepName: string
  sampleCount: number
  avgDays?: number | null
}

type CompanyStatusResponse = {
  companyName: string
  regularReports?: TimelineUnit[]
  regularTimelines?: TimelineUnit[]
  internReports?: TimelineUnit[]
  internTimelines?: TimelineUnit[]
  rollingReports?: RollingStep[]
  timelines?: TimelineUnit[]
  rollingSteps?: RollingStep[]
}

type PageProps = {
  params: Promise<{ companySlug: string }>
}

async function fetchCompanyStatus(companyName: string): Promise<CompanyStatusResponse | null> {
  const apiBaseUrl = (
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    ""
  ).replace(/\/$/, "")
  if (!apiBaseUrl) return null

  try {
    const response = await fetch(`${apiBaseUrl}/api/companies/${encodeURIComponent(companyName)}/status`, {
      cache: "no-store",
    })
    if (!response.ok) return null
    return (await response.json()) as CompanyStatusResponse
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)
  const siteUrl = getSiteUrl()
  const url = `${siteUrl}/company/${encodeURIComponent(companyName)}`

  return {
    title: `${companyName} 채용 현황`,
    description: `${companyName}의 공채/수시 채용 데이터 요약입니다.`,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: `${companyName} 채용 현황`,
      description: `${companyName}의 공채/수시 채용 데이터 요약입니다.`,
      locale: "ko_KR",
    },
  }
}

export default async function CompanyPublicPage({ params }: PageProps) {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)
  const status = await fetchCompanyStatus(companyName)
  const regularUnits = status?.regularReports ?? status?.regularTimelines ?? status?.timelines ?? []
  const internUnits = status?.internReports ?? status?.internTimelines ?? []
  const rollingSteps = status?.rollingReports ?? status?.rollingSteps ?? []
  const hasRegular = regularUnits.length > 0
  const hasIntern = internUnits.length > 0
  const hasRolling = rollingSteps.length > 0
  const regularStepCards = regularUnits
    .flatMap((unit) => unit.steps ?? [])
    .map((step, idx) => ({
      key: `regular-${step.label}-${idx}`,
      label: step.label,
      days: step.diffDays,
    }))

  const renderInterval = (days: number | null | undefined) => {
    if (days == null) return <span>기간 통계 없음</span>
    return (
      <span>
        이전 단계와 간격: <span className="font-semibold text-primary">{days}일</span>
      </span>
    )
  }

  return (
    <main className="page-shell [--page-max:56rem] py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{companyName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">공채/수시 데이터가 있는 항목만 노출합니다.</p>
      </header>

      {!hasRegular && !hasIntern && !hasRolling ? (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">공개 데이터가 없습니다</h2>
          <p className="mt-2 text-sm text-muted-foreground">검색에서 다시 확인해 주세요.</p>
        </section>
      ) : (
        <section className="space-y-6">
          {hasRegular && (
            <article id="regular" className="rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">공채</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {regularStepCards.slice(0, 12).map((item) => (
                  <li key={item.key} className="rounded-lg border border-border/60 px-3 py-2">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p>{renderInterval(item.days)}</p>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {hasIntern && (
            <article id="intern" className="rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">인턴</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {internUnits
                  .flatMap((unit) => unit.steps ?? [])
                  .slice(0, 12)
                  .map((item, idx) => (
                    <li key={`intern-${item.label}-${idx}`} className="rounded-lg border border-border/60 px-3 py-2">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p>{renderInterval(item.diffDays)}</p>
                    </li>
                  ))}
              </ul>
            </article>
          )}

          {hasRolling && (
            <article id="rolling" className="rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">수시</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {rollingSteps.map((item) => (
                  <li key={`rolling-${item.stepName}`} className="rounded-lg border border-border/60 px-3 py-2">
                    <p className="font-medium text-foreground">{item.stepName}</p>
                    <p>{renderInterval(item.avgDays)}</p>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </section>
      )}

      <div className="mt-8">
        <Link href={`/search?company=${encodeURIComponent(companyName)}`} className="inline-flex rounded-xl border border-border/60 px-4 py-2 text-sm text-foreground hover:bg-accent/60">
          검색 페이지에서 상세 보기
        </Link>
      </div>
    </main>
  )
}
