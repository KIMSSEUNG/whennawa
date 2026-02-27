const FALLBACK_SITE_URL = "https://whennawa.com"

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? FALLBACK_SITE_URL
  return value.replace(/\/$/, "")
}

