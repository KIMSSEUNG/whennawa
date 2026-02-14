"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/search", label: "Search" },
  { href: "/profile", label: "Profile" },
]

export function TopNavBar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:block">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/search" className="flex items-center gap-2">
          <Image src="/logo.png" alt="언제나와 로고" width={32} height={32} className="rounded-lg" priority />
          <span className="text-xl font-semibold">언제나와</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
