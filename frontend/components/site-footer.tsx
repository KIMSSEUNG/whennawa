import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/95">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/terms" className="transition-colors hover:text-foreground">
            이용약관
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            개인정보처리방침
          </Link>
        </div>
        <div>문의: whennawa@gmail.com</div>
      </div>
    </footer>
  )
}
