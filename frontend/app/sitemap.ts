import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const now = new Date()

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
  ]
}
