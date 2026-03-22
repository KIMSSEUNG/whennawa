import type { Metadata } from "next"
import { getSiteUrl } from "@/lib/seo"

const SITE_NAME = "언제나와"

function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${siteUrl}${normalizedPath}`
}

export function buildCompanySummaryMetadata(companyName: string, path: string): Metadata {
  const title = `${companyName} 전형별 평균 발표 일자 요약 | ${SITE_NAME}`
  const description = `${companyName} 공채, 인턴, 수시 전형에서 등록된 발표 일자 평균을 전형별로 확인하세요.`
  const url = absoluteUrl(path)

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: "ko_KR",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${title} 미리보기 이미지`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  }
}

export function buildCompanySummaryJsonLd(companyName: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${companyName} 전형별 평균 발표 일자 요약`,
    description: `${companyName} 공채, 인턴, 수시 전형에서 등록된 발표 일자 평균을 전형별로 확인할 수 있는 페이지입니다.`,
    url: absoluteUrl(path),
    about: {
      "@type": "Organization",
      name: companyName,
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  }
}
