import type { RecruitmentMode } from "@/lib/types"

export type CompanyDetailMode = RecruitmentMode

export function toModeSlug(mode: CompanyDetailMode) {
  if (mode === "REGULAR") return "공채"
  if (mode === "INTERN") return "인턴"
  return "수시"
}

export function fromModeSlug(modeSlug: string | undefined | null): CompanyDetailMode | null {
  if (!modeSlug) return null

  const normalized = decodeURIComponent(modeSlug).trim().toLowerCase()

  if (normalized === "공채") return "REGULAR"
  if (normalized === "인턴") return "INTERN"
  if (normalized === "수시") return "ROLLING"
  if (normalized === "regular") return "REGULAR"
  if (normalized === "intern") return "INTERN"
  if (normalized === "rolling") return "ROLLING"

  return null
}

export function toStepSlug(stepName: string) {
  return encodeURIComponent(stepName.trim())
}

export function fromStepSlug(stepSlug: string | undefined | null) {
  if (!stepSlug) return ""
  return decodeURIComponent(stepSlug)
}

export function buildCompanyDetailPath(companyName: string, mode?: CompanyDetailMode | null, stepName?: string | null) {
  const params = new URLSearchParams()
  const normalizedCompanyName = companyName.trim()
  params.set("q", normalizedCompanyName)
  params.set("company", normalizedCompanyName)
  if (mode) {
    params.set("mode", toModeSlug(mode))
  }
  if (stepName?.trim()) {
    params.set("step", stepName.trim())
  }
  return `/search?${params.toString()}`
}
