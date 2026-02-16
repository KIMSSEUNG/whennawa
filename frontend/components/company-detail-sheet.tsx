"use client"

import type React from "react"
import type { CompanySearchItem, CompanyTimeline, KeywordLeadTime } from "@/lib/types"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CompanyDetailPanel } from "@/components/company-detail-panel"

interface CompanyDetailSheetProps {
  company: CompanySearchItem | null
  timeline: CompanyTimeline | null
  leadTime: KeywordLeadTime | null
  keyword: string
  lastLeadTimeKeyword: string
  onKeywordChange: (value: string) => void
  onKeywordSearch: (event: React.FormEvent, keywordOverride?: string) => void
  selectedCalendarDate: string | null
  onCalendarDateSelect: (dateStr: string) => void
  isCalendarVisible: boolean
  isTimelineLoading: boolean
  isLeadTimeLoading: boolean
  onQuickReport: (companyName: string, mode: "REGULAR" | "ROLLING") => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompanyDetailSheet({
  company,
  timeline,
  leadTime,
  keyword,
  lastLeadTimeKeyword,
  onKeywordChange,
  onKeywordSearch,
  selectedCalendarDate,
  onCalendarDateSelect,
  isCalendarVisible,
  isTimelineLoading,
  isLeadTimeLoading,
  onQuickReport,
  open,
  onOpenChange,
}: CompanyDetailSheetProps) {
  if (!company) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl p-0">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-left text-xl">{company.companyName}</SheetTitle>
        </SheetHeader>
        <CompanyDetailPanel
          company={company}
          timeline={timeline}
          leadTime={leadTime}
          keyword={keyword}
          lastLeadTimeKeyword={lastLeadTimeKeyword}
          onKeywordChange={onKeywordChange}
          onKeywordSearch={onKeywordSearch}
          selectedCalendarDate={selectedCalendarDate}
          onCalendarDateSelect={onCalendarDateSelect}
          isCalendarVisible={isCalendarVisible}
          isTimelineLoading={isTimelineLoading}
          isLeadTimeLoading={isLeadTimeLoading}
          onQuickReport={onQuickReport}
          className="h-full"
        />
      </SheetContent>
    </Sheet>
  )
}

