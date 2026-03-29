import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"
import { toCompanySlug } from "@/lib/company-slug"

type CompanyListItem = {
  companyId?: number | null
  companyName: string
}

type CompanyStatusItem = {
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()
  const companies = await fetchCompanies()

  const interviewReviewRoutes = (
    await Promise.all(
      companies.map(async (company) => {
        const companyName = company.companyName.trim()
        if (!companyName) return null

        const status = await fetchCompanyStatus(companyName)
        if (!status?.interviewReviews?.length) return null

        return {
          url: `${siteUrl}/interview-reviews/${toCompanySlug(companyName)}`,
          lastModified: now,
          changeFrequency: "daily" as const,
          priority: 0.74,
        }
      }),
    )
  ).filter((route): route is NonNullable<typeof route> => Boolean(route))

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...interviewReviewRoutes,
  ]
}
