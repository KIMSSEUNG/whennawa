import type { Metadata } from "next"
import { getSiteUrl } from "@/lib/seo"

const siteName = "언제나와"
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "").replace(/\/$/, "")

type BoardPostSeo = {
  postId: number
  companyName: string
  title: string
  content: string
  authorName: string
  createdAt: string | Date
}

function absoluteUrl(path: string) {
  const siteUrl = getSiteUrl()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${siteUrl}${normalizedPath}`
}

function summarizeText(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function buildSeoMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string
  description: string
  path: string
  type?: "website" | "article"
}): Metadata {
  const url = absoluteUrl(path)

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type,
      url,
      siteName,
      title,
      description,
      locale: "ko_KR",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${title} 링크 미리보기 이미지`,
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

export async function fetchBoardPostSeo(companyName: string, postId: string | number) {
  if (!API_BASE_URL || !companyName.trim()) {
    return null
  }

  const response = await fetch(`${API_BASE_URL}/api/boards/${encodeURIComponent(companyName)}/posts/${postId}`, {
    headers: {
      "Content-Type": "application/json",
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as BoardPostSeo
}

export async function fetchCareerBoardPostSeo(postId: string | number) {
  if (!API_BASE_URL) {
    return null
  }

  const response = await fetch(`${API_BASE_URL}/api/career-board/posts/${postId}`, {
    headers: {
      "Content-Type": "application/json",
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as BoardPostSeo
}

export function buildBoardCollectionMetadata(companyName: string, path: string) {
  return buildSeoMetadata({
    title: `${companyName} 게시판`,
    description: `${companyName} 지원 후기, 전형 정보, 질문과 답변을 한곳에서 확인할 수 있는 회사별 커뮤니티 게시판입니다.`,
    path,
  })
}

export function buildBoardPostMetadata(post: BoardPostSeo, path: string) {
  return buildSeoMetadata({
    title: `${post.title} - ${post.companyName} 게시판`,
    description: summarizeText(post.content, 155),
    path,
    type: "article",
  })
}

export function buildCareerBoardPostMetadata(post: BoardPostSeo, path: string) {
  return buildSeoMetadata({
    title: `${post.title} - 취업 고민 게시판`,
    description: summarizeText(post.content, 155),
    path,
    type: "article",
  })
}

export function buildWebsiteJsonLd() {
  const siteUrl = getSiteUrl()

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}

export function buildBoardCollectionJsonLd(companyName: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${companyName} 게시판`,
    description: `${companyName} 지원 후기, 전형 정보, 질문과 답변을 한곳에서 확인할 수 있는 회사별 커뮤니티 게시판입니다.`,
    url: absoluteUrl(path),
    about: {
      "@type": "Organization",
      name: companyName,
    },
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: getSiteUrl(),
    },
  }
}

export function buildDiscussionPostingJsonLd(post: BoardPostSeo, path: string, sectionName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: post.title,
    articleSection: sectionName,
    articleBody: summarizeText(post.content, 5000),
    datePublished: new Date(post.createdAt).toISOString(),
    author: {
      "@type": "Person",
      name: post.authorName || "익명",
    },
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: getSiteUrl(),
    },
    mainEntityOfPage: absoluteUrl(path),
  }
}
