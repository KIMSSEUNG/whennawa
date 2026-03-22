import type { Metadata } from "next"
import type { CompanyDetailMode } from "@/lib/company-detail-route"
import { getSiteUrl } from "@/lib/seo"

const SITE_NAME = "언제나와"

function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${siteUrl}${normalizedPath}`
}

function getModeLabel(mode: CompanyDetailMode | null | undefined) {
  if (mode === "REGULAR") return "공채"
  if (mode === "INTERN") return "인턴"
  if (mode === "ROLLING") return "수시"
  return null
}

export function buildCompanyDetailMetadata(
  companyName: string,
  path: string,
  options?: { mode?: CompanyDetailMode | null; stepName?: string | null },
): Metadata {
  const modeLabel = getModeLabel(options?.mode)
  const stepName = options?.stepName?.trim() || null
  const title = stepName
    ? `${companyName} ${stepName} 결과 발표 흐름 | ${SITE_NAME}`
    : modeLabel
      ? `${companyName} ${modeLabel} 발표 일정 및 면접 결과 발표 흐름 | ${SITE_NAME}`
      : `${companyName} 발표 일정 및 면접 결과 발표 흐름 | ${SITE_NAME}`
  const description = stepName
    ? `${companyName} ${stepName} 결과 발표까지 평균 며칠이 걸리는지와 실제 후기, 등록된 발표 흐름을 확인하세요.`
    : modeLabel
      ? `${companyName} ${modeLabel} 전형의 서류 발표, 면접 결과 발표, 전형별 평균 소요 기간과 실제 후기를 한 페이지에서 확인하세요.`
      : `${companyName} 서류 발표, 면접 결과 발표, 전형별 평균 소요 기간과 실제 후기를 한 페이지에서 확인하세요.`
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

export function buildCompanyDetailJsonLd(
  companyName: string,
  path: string,
  options?: { mode?: CompanyDetailMode | null; stepName?: string | null },
) {
  const modeLabel = getModeLabel(options?.mode)
  const stepName = options?.stepName?.trim() || null
  const name = stepName
    ? `${companyName} ${stepName} 결과 발표 흐름`
    : modeLabel
      ? `${companyName} ${modeLabel} 발표 일정 및 면접 결과 발표 흐름`
      : `${companyName} 발표 일정 및 면접 결과 발표 흐름`
  const description = stepName
    ? `${companyName} ${stepName} 결과 발표까지 평균 며칠이 걸리는지와 실제 후기, 등록된 발표 흐름을 확인할 수 있는 페이지입니다.`
    : modeLabel
      ? `${companyName} ${modeLabel} 전형의 서류 발표, 면접 결과 발표, 전형별 평균 소요 기간과 실제 후기를 확인할 수 있는 페이지입니다.`
      : `${companyName} 서류 발표, 면접 결과 발표, 전형별 평균 소요 기간과 실제 후기를 확인할 수 있는 페이지입니다.`

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
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
