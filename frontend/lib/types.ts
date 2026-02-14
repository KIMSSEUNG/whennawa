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
  timelines: Array<{
    unitName: string
    channelType: "FIRST_HALF" | "SECOND_HALF" | "ALWAYS"
    year: number
    steps: CompanyTimelineStep[]
  }>
}

export interface KeywordLeadTime {
  keyword: string
  medianDays: number | null
  minDays: number | null
  maxDays: number | null
}

export type RecruitmentChannelType = "FIRST_HALF" | "SECOND_HALF" | "ALWAYS"

export type ReportStatus = "PENDING" | "PROCESSED" | "DISCARDED"

export interface ReportStep {
  stepId: number
  stepName: string
}

export interface ReportItem {
  reportId: number
  reportCount: number
  companyName: string
  channelType: RecruitmentChannelType
  unitName: string | null
  reportedDate: Date
  stepId: number | null
  stepName: string | null
  stepNameRaw: string | null
  status: ReportStatus
  onHold: boolean
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
