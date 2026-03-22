import type { Metadata } from "next"
import type React from "react"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { buildCareerBoardPostMetadata, buildDiscussionPostingJsonLd, fetchCareerBoardPostSeo } from "@/lib/seo-metadata"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ postId: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { postId } = await params
  const post = await fetchCareerBoardPostSeo(postId)

  if (!post) {
    return {
      title: "취업 고민 게시글",
      description: "취업 준비 경험과 고민을 공유하는 게시글을 확인해 보세요.",
      alternates: {
        canonical: "/career-board",
      },
    }
  }

  return buildCareerBoardPostMetadata(post, `/career-board/posts/${postId}`)
}

export default async function CareerBoardPostDetailLayout({ children, params }: LayoutProps) {
  const { postId } = await params
  const post = await fetchCareerBoardPostSeo(postId)

  return (
    <>
      {post ? <SeoJsonLd data={buildDiscussionPostingJsonLd(post, `/career-board/posts/${postId}`, "취업 고민 게시판")} /> : null}
      {children}
    </>
  )
}
