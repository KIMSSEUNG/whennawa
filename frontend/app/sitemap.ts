import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"
import { toCompanySlug } from "@/lib/company-slug"
import { toModeSlug } from "@/lib/company-detail-route"

type CompanyListItem = {
  companyId?: number | null
  companyName: string
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()
  const companies = await fetchCompanies()

  const companyRoutes = companies.flatMap((company) => {
    const companySlug = toCompanySlug(company.companyName)
    const regularModeSlug = encodeURIComponent(toModeSlug("REGULAR"))
    const internModeSlug = encodeURIComponent(toModeSlug("INTERN"))
    const rollingModeSlug = encodeURIComponent(toModeSlug("ROLLING"))

    return [
      {
        url: `${siteUrl}/board/${companySlug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.85,
      },
      {
        url: `${siteUrl}/board/${companySlug}/summary`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      {
        url: `${siteUrl}/interview-reviews/${companySlug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      {
        url: `${siteUrl}/companies/${companySlug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.75,
      },
      {
        url: `${siteUrl}/companies/${companySlug}/${regularModeSlug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.72,
      },
      {
        url: `${siteUrl}/companies/${companySlug}/${internModeSlug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.72,
      },
      {
        url: `${siteUrl}/companies/${companySlug}/${rollingModeSlug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.72,
      },
    ]
  })

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
    {
      url: `${siteUrl}/board`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/career-board`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.75,
    },
    ...companyRoutes,
  ]
}
