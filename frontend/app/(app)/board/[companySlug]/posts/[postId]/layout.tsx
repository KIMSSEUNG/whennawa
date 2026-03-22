import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { fromCompanySlug } from "@/lib/company-slug"
import { buildBoardCollectionMetadata, buildBoardPostMetadata, buildDiscussionPostingJsonLd, fetchBoardPostSeo } from "@/lib/seo-metadata"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ companySlug: string; postId: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { companySlug, postId } = await params
  const companyName = fromCompanySlug(companySlug)
  const post = await fetchBoardPostSeo(companyName, postId)

  if (!post) {
    return buildBoardCollectionMetadata(companyName, `/board/${companySlug}`)
  }

  return buildBoardPostMetadata(post, `/board/${companySlug}/posts/${postId}`)
}

export default async function BoardPostDetailLayout({ children, params }: LayoutProps) {
  const { companySlug, postId } = await params
  const companyName = fromCompanySlug(companySlug)
  const post = await fetchBoardPostSeo(companyName, postId)

  return (
    <>
      {post ? <SeoJsonLd data={buildDiscussionPostingJsonLd(post, `/board/${companySlug}/posts/${postId}`, `${companyName} 게시판`)} /> : null}
      {children}
    </>
  )
}
