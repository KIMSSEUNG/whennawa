import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/search",
          "/interview-reviews/",
          "/board/*/summary",
        ],
        disallow: [
          "/admin",
          "/login",
          "/profile",
          "/board",
          "/board/",
          "/career-board",
          "/career-board/",
          "/notifications",
          "/board/*/write",
          "/career-board/write",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
