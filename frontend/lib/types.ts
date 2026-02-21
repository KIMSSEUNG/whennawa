export interface CompanySearchItem {
  companyName: string
  lastResultAt: Date | null
}

export interface CompanyTimelineStep {
  eventType: string
  label: string
  occurredAt: Date | null
  diffDays: number | null
  prevStepId?: number | null
}

export interface CompanyTimeline {
  companyId: number | null
  companyName: string
  regularTimelines: Array<{
    year: number
    steps: CompanyTimelineStep[]
  }>
  rollingSteps: RollingStepStat[]
}

export interface KeywordLeadTime {
  keyword: string
  medianDays: number | null
  minDays: number | null
  maxDays: number | null
}

export type RecruitmentMode = "REGULAR" | "ROLLING"
export type RollingReportType = "DATE_REPORTED" | "NO_RESPONSE_REPORTED"

export type ReportStatus = "PENDING" | "PROCESSED" | "DISCARDED"

export interface ReportStep {
  stepId: number
  stepName: string
}

export interface ReportItem {
  reportId: number
  reportCount: number
  companyName: string
  recruitmentMode: RecruitmentMode
  rollingResultType: RollingReportType | null
  prevReportedDate: Date | null
  prevStepName: string | null
  currentStepName: string | null
  reportedDate: Date | null
  stepId: number | null
  stepName: string | null
  status: ReportStatus
  onHold: boolean
}

export interface RollingStepStat {
  stepName: string
  sampleCount: number
  noResponseCount: number
  avgDays: number | null
  minDays: number | null
  maxDays: number | null
}

export interface RollingPrediction {
  stepName: string
  previousStepDate: Date
  sampleCount: number
  expectedDate: Date | null
  expectedStartDate: Date | null
  expectedEndDate: Date | null
}

export interface User {
  id: string
  name: string
  email: string
  role?: "USER" | "ADMIN"
  avatar?: string
}

export interface ChatMessage {
  companyId: number
  senderNickname: string
  message: string
  timestamp: Date
}
