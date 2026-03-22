"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type CompanyIconProps = {
  companyId?: number | null
  companyName: string
  size?: number
  className?: string
  textClassName?: string
}

function getFallbackLabel(companyName: string) {
  const normalized = companyName.trim()
  if (!normalized) {
    return "?"
  }
  return normalized.charAt(0).toUpperCase()
}

export function CompanyIcon({
  companyId,
  companyName,
  size = 40,
  className,
  textClassName,
}: CompanyIconProps) {
  const [hasError, setHasError] = useState(false)
  const src = useMemo(() => {
    if (companyId == null || companyId <= 0) {
      return null
    }
    return `/icons/companies/${companyId}/icon.png`
  }, [companyId])

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,#4d84ff_0%,#2a63e8_100%)] font-extrabold text-white shadow-[0_10px_24px_rgba(44,92,221,0.18)]",
          className,
        )}
        style={{ width: size, height: size }}
        aria-label={`${companyName} 아이콘`}
      >
        <span className={cn("text-sm leading-none", textClassName)}>{getFallbackLabel(companyName)}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[14px] border border-[#dce5ff] bg-white shadow-[0_10px_24px_rgba(111,135,196,0.12)] dark:border-[#31415f] dark:bg-[#16213a]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={`${companyName} 로고`}
        fill
        sizes={`${size}px`}
        className="object-contain p-1.5"
        onError={() => setHasError(true)}
      />
    </div>
  )
}
