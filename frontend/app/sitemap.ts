import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"
import { toCompanySlug } from "@/lib/company-slug"
import { toModeSlug } from "@/lib/company-detail-route"

type CompanyListItem = {
  companyId?: number | null
  companyName: string
}

type CompanyStatusItem = {
  regularTimelines?: Array<{
    steps: Array<{ label?: string | null }>
  }> | null
  internTimelines?: Array<{
    steps: Array<{ label?: string | null }>
  }> | null
  rollingSteps?: Array<{ stepName?: string | null }> | null
  interviewReviews?: Array<{
    reviewId?: number | null
  }> | null
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "").replace(/\/$/, "")

async function fetchCompanies(): Promise<CompanyListItem[]> {
  if (!API_BASE_URL) return []

  try {
    const response = await fetch(`${API_BASE_URL}/api/companies`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) return []
    const data = (await response.json()) as CompanyListItem[]
    return Array.isArray(data) ? data.filter((item) => item?.companyName?.trim()) : []
  } catch {
    return []
  }
}

async function fetchCompanyStatus(companyName: string): Promise<CompanyStatusItem | null> {
  if (!API_BASE_URL || !companyName.trim()) return null

  try {
    const response = await fetch(`${API_BASE_URL}/api/companies/${encodeURIComponent(companyName)}/status`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) return null
    return (await response.json()) as CompanyStatusItem
  } catch {
    return null
  }
}

function buildSearchUrl(siteUrl: string, companyName: string, mode?: "REGULAR" | "INTERN" | "ROLLING", stepName?: string) {
  const params = new URLSearchParams()
  params.set("q", companyName)
  params.set("company", companyName)
  if (mode) {
    params.set("mode", toModeSlug(mode))
  }
  if (stepName?.trim()) {
    params.set("step", stepName.trim())
  }
  return `${siteUrl}/search?${params.toString()}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()
  const companies = await fetchCompanies()

  const companyRoutes = (
    await Promise.all(
      companies.map(async (company) => {
        const companyName = company.companyName.trim()
        if (!companyName) return []
        const companySlug = toCompanySlug(companyName)

        const status = await fetchCompanyStatus(companyName)
        const regularSteps = Array.from(
          new Set(
            status?.regularTimelines?.flatMap((item) => item.steps.map((step) => step.label?.trim())).filter((value): value is string => Boolean(value)) ?? [],
          ),
        )
        const internSteps = Array.from(
          new Set(
            status?.internTimelines?.flatMap((item) => item.steps.map((step) => step.label?.trim())).filter((value): value is string => Boolean(value)) ?? [],
          ),
        )
        const rollingSteps = Array.from(
          new Set(status?.rollingSteps?.map((item) => item.stepName?.trim()).filter((value): value is string => Boolean(value)) ?? []),
        )
        const hasRegularData = Boolean(status?.regularTimelines?.some((item) => item.steps?.length))
        const hasInternData = Boolean(status?.internTimelines?.some((item) => item.steps?.length))
        const hasRollingData = Boolean(status?.rollingSteps?.length)
        const hasInterviewReviewData = Boolean(status?.interviewReviews?.length)
        const hasSearchIndexableData = hasRegularData || hasInternData || hasRollingData

        if (!hasSearchIndexableData && !hasInterviewReviewData) {
          return []
        }

        return [
          ...(hasSearchIndexableData
            ? [
                {
                  url: buildSearchUrl(siteUrl, companyName),
                  lastModified: now,
                  changeFrequency: "daily" as const,
                  priority: 0.85,
                },
              ]
            : []),
          ...(hasRegularData
            ? [
                {
                  url: buildSearchUrl(siteUrl, companyName, "REGULAR"),
                  lastModified: now,
                  changeFrequency: "daily" as const,
                  priority: 0.8,
                },
              ]
            : []),
          ...(hasInternData
            ? [
                {
                  url: buildSearchUrl(siteUrl, companyName, "INTERN"),
                  lastModified: now,
                  changeFrequency: "daily" as const,
                  priority: 0.8,
                },
              ]
            : []),
          ...(hasRollingData
            ? [
                {
                  url: buildSearchUrl(siteUrl, companyName, "ROLLING"),
                  lastModified: now,
                  changeFrequency: "daily" as const,
                  priority: 0.8,
                },
              ]
            : []),
          ...(status?.interviewReviews?.length
            ? [
                {
                  url: `${siteUrl}/interview-reviews/${companySlug}`,
                  lastModified: now,
                  changeFrequency: "daily" as const,
                  priority: 0.74,
                },
              ]
            : []),
          ...regularSteps.map((stepName) => ({
            url: buildSearchUrl(siteUrl, companyName, "REGULAR", stepName),
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.72,
          })),
          ...internSteps.map((stepName) => ({
            url: buildSearchUrl(siteUrl, companyName, "INTERN", stepName),
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.72,
          })),
          ...rollingSteps.map((stepName) => ({
            url: buildSearchUrl(siteUrl, companyName, "ROLLING", stepName),
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.72,
          })),
        ]
      }),
    )
  )
    .flat()
    .filter((route, index, routes) => routes.findIndex((candidate) => candidate.url === route.url) === index)

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...companyRoutes,
  ]
}
