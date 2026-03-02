import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SiteFooter } from "@/components/site-footer"
import { getSiteUrl } from "@/lib/seo"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const siteUrl = getSiteUrl()
const siteName = "\uC5B8\uC81C\uB098\uC640"
const siteTitle = `${siteName} | \uCC44\uC6A9 \uD0C0\uC784\uB77C\uC778`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: "채용 공고 일정과 지원 흐름을 한 번에 확인하는 취업 타임라인 서비스.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: siteTitle,
    description: "채용 공고 일정과 지원 흐름을 한 번에 확인하는 취업 타임라인 서비스.",
    locale: "ko_KR",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "언제나와 채용 타임라인 링크 미리보기 이미지",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: "채용 공고 일정과 지원 흐름을 한 번에 확인하는 취업 타임라인 서비스.",
    images: ["/twitter-image"],
  },
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteName,
  },
  icons: {
    icon: [
      {
        url: "/icon.png",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3B5BDB" },
    { media: "(prefers-color-scheme: dark)", color: "#2F49B3" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-dvh bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex min-h-dvh flex-col">
            <div className="flex-1">{children}</div>
            <div className="pb-20 md:pb-0">
              <SiteFooter />
            </div>
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
