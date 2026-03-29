import type { Metadata } from "next"
import type React from "react"
import { fromCompanySlug } from "@/lib/company-slug"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ companySlug: string }>
}

type CompanyStatusItem = {
  interviewReviews?: Array<{
    reviewId?: number | null
  }> | null
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "").replace(/\/$/, "")

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

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { companySlug } = await params
  const companyName = fromCompanySlug(companySlug)
  const status = await fetchCompanyStatus(companyName)
  const hasInterviewReviews = Boolean(status?.interviewReviews?.length)

  return {
    title: `${companyName} 면접 후기`,
    description: `${companyName} 면접 후기와 전형 경험을 확인하세요.`,
    robots: {
      index: hasInterviewReviews,
      follow: hasInterviewReviews,
    },
  }
}

export default function InterviewReviewsLayout({ children }: LayoutProps) {
  return children
}
