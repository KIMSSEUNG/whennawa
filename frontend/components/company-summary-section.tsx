"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchCompanyStatus } from "@/lib/api"
import type { CompanyStatus } from "@/lib/types"
import { boardTheme } from "@/lib/board-theme"

type SummaryCard = {
  key: string
  title: string
  subtitle: string
  latestDate: Date | null
  metrics: Array<{
    stepName: string
    avgDays: number
  }>
}

function formatDateYmd(value: Date) {
  return value.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function average(values: number[]) {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function buildTimelineSummary(
  title: string,
  subtitle: string,
  timelines: CompanyStatus["regularTimelines"] | CompanyStatus["internTimelines"],
): SummaryCard | null {
  if (timelines.length === 0) return null

  const allSteps = timelines.flatMap((item) => item.steps)
  const latestDate =
    allSteps
      .map((step) => step.occurredAt)
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null

  const grouped = new Map<string, number[]>()
  for (const step of allSteps) {
    if (!step.label?.trim() || step.diffDays == null) continue
    const current = grouped.get(step.label) ?? []
    current.push(step.diffDays)
    grouped.set(step.label, current)
  }

  const metrics = Array.from(grouped.entries())
    .map(([stepName, values]) => ({
      stepName,
      avgDays: average(values),
    }))
    .filter((item): item is { stepName: string; avgDays: number } => item.avgDays != null)
    .sort((a, b) => a.avgDays - b.avgDays)

  return {
    key: title,
    title,
    subtitle,
    latestDate,
    metrics,
  }
}

function buildRollingSummary(companyName: string, rollingSteps: CompanyStatus["rollingSteps"]): SummaryCard | null {
  if (rollingSteps.length === 0) return null

  return {
    key: "수시",
    title: "수시",
    subtitle: `${companyName} 수시 전형의 평균 발표 일자를 정리했습니다.`,
    latestDate: null,
    metrics: rollingSteps
      .filter((item): item is typeof item & { avgDays: number } => item.avgDays != null)
      .map((item) => ({
        stepName: item.stepName,
        avgDays: item.avgDays,
      }))
      .sort((a, b) => a.avgDays - b.avgDays),
  }
}

export function CompanySummarySection({ companyName }: { companyName: string }) {
  const [companyStatus, setCompanyStatus] = useState<CompanyStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchCompanyStatus(companyName)
      .then((data) => {
        if (!cancelled) setCompanyStatus(data)
      })
      .catch(() => {
        if (!cancelled) setCompanyStatus(null)
      })
    return () => {
      cancelled = true
    }
  }, [companyName])

  const summaryCards = useMemo(() => {
    const cards: SummaryCard[] = []

    const regularCard = buildTimelineSummary(
      "공채",
      `${companyName} 공채 전형의 평균 발표 일자를 정리했습니다.`,
      companyStatus?.regularTimelines ?? [],
    )
    if (regularCard) cards.push(regularCard)

    const internCard = buildTimelineSummary(
      "인턴",
      `${companyName} 인턴 전형의 평균 발표 일자를 정리했습니다.`,
      companyStatus?.internTimelines ?? [],
    )
    if (internCard) cards.push(internCard)

    const rollingCard = buildRollingSummary(companyName, companyStatus?.rollingSteps ?? [])
    if (rollingCard) cards.push(rollingCard)

    return cards
  }, [companyName, companyStatus])

  return (
    <section id="summary" className={`${boardTheme.card} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className={`text-base font-semibold ${boardTheme.titleText}`}>정보 요약</h2>
          <p className={`mt-1 text-sm ${boardTheme.metaText}`}>
            {companyName}의 공채, 인턴, 수시 전형에서 확인 가능한 평균 발표 일자를 전형별로 정리했습니다.
          </p>
        </div>
        <span className={boardTheme.tag}>실제 등록 데이터 기준</span>
      </div>

      {summaryCards.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-background px-4 py-5 text-sm text-muted-foreground">
          아직 정리된 발표 일정 데이터가 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <article key={card.key} className="rounded-2xl border border-border/60 bg-background px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className={`text-sm font-semibold ${boardTheme.titleText}`}>{card.title}</h3>
                  <p className={`mt-1 text-xs ${boardTheme.metaText}`}>{card.subtitle}</p>
                </div>
                <span className={boardTheme.tag}>요약</span>
              </div>

              {card.latestDate ? (
                <p className={`mb-3 text-sm ${boardTheme.metaText}`}>
                  최근 등록 발표일은 <span className="font-semibold text-primary">{formatDateYmd(card.latestDate)}</span> 기준입니다.
                </p>
              ) : null}

              {card.metrics.length === 0 ? (
                <p className={`text-sm ${boardTheme.metaText}`}>평균 일자를 계산할 수 있는 전형 데이터가 아직 없습니다.</p>
              ) : (
                  <div className="space-y-2">
                    {card.metrics.map((metric) => (
                      <div
                        key={`${card.key}-${metric.stepName}`}
                        className="rounded-xl border border-[#d8e2fb] bg-white px-3 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.92)] dark:border-[#31415f] dark:bg-[#16213a]"
                      >
                        <p className={`text-sm ${boardTheme.metaText}`}>
                          <span className="font-semibold text-primary">{metric.stepName}</span>
                          <span> 결과는 평균 </span>
                        <span className="font-semibold text-primary">{metric.avgDays}일</span>
                        <span> 후 등록됐습니다.</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
