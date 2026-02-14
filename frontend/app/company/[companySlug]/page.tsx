import type { Metadata } from "next"
import Link from "next/link"
import { fromCompanySlug } from "@/lib/company-slug"
import { getSiteUrl } from "@/lib/seo"

type TimelineStep = {
  label: string
  occurredAt: string | null
}

type TimelineUnit = {
  unitName: string
  channelType: string
  year: number
  steps: TimelineStep[]
}

type CompanyTimelineResponse = {
  companyName: string
  timelines: TimelineUnit[]
}

type PageProps = {
  params: Promise<{ companySlug: string }>
}

function toLabelDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${month}-${day}`
}

async function fetchTimeline(companyName: string): Promise<CompanyTimelineResponse | null> {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
  if (!apiBaseUrl) return null

  try {
    const response = await fetch(`${apiBaseUrl}/api/companies/${encodeURIComponent(companyName)}/timeline`, {
      cache: "no-store",
    })
    if (!response.ok) return null
    return (await response.json()) as CompanyTimelineResponse
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
    title: `${companyName} 채용 타임라인`,
    description: `${companyName}의 채용 전형 흐름과 최근 타임라인 요약입니다.`,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: `${companyName} 채용 타임라인`,
      description: `${companyName}의 채용 전형 흐름과 최근 타임라인 요약입니다.`,
      locale: "ko_KR",
    },
  }
}

export default async function CompanyPublicPage({ params }: PageProps) {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)
  const timeline = await fetchTimeline(companyName)
  const units = timeline?.timelines ?? []

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{companyName} 채용 타임라인</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          회사별 공개 요약 페이지입니다. 상세 검색과 참여 기능은 검색 페이지에서 이용할 수 있습니다.
        </p>
      </header>

      {units.length === 0 ? (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">공개된 타임라인 데이터가 없습니다</h2>
          <p className="mt-2 text-sm text-muted-foreground">잠시 후 다시 확인하거나 검색 페이지를 이용해 주세요.</p>
        </section>
      ) : (
        <section className="space-y-4">
          {units.map((unit) => (
            <article key={`${unit.unitName}-${unit.channelType}-${unit.year}`} className="rounded-2xl border border-border/60 bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">{unit.unitName}</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(unit.steps ?? []).slice(0, 5).map((step, idx) => (
                  <li key={`${step.label}-${idx}`} className="flex items-center justify-between gap-3">
                    <span className="text-foreground">{step.label}</span>
                    <span>{toLabelDate(step.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
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
