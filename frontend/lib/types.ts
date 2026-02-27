export interface CompanySearchItem {
  companyName: string
  lastResultAt: Date | null
}

export interface CompanyTimelineStep {
  eventType: string
  label: string
  occurredAt: Date | null
  diffDays: number | null
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
export type CompanyRequestStatus = "PENDING" | "PROCESSED" | "DISCARDED"

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

export interface CompanyCreateResult {
  companyId: number | null
  requestId: number | null
  companyName: string
  originalCompanyName: string
  created: boolean
  pending: boolean
  normalizedChanged: boolean
  message: string | null
}

export interface CompanyNameRequestItem {
  requestId: number
  originalCompanyName: string
  normalizedCompanyName: string
  requestCount: number
  status: CompanyRequestStatus
  alreadyExists: boolean
  existingCompanyName: string | null
  message: string | null
  createdAt: Date
  updatedAt: Date
}

export interface BoardPost {
  postId: number
  companyId: number
  companyName: string
  title: string
  content: string
  authorUserId: number | null
  authorName: string
  createdAt: Date
}

export interface BoardComment {
  commentId: number
  postId: number
  parentCommentId: number | null
  content: string
  authorUserId: number | null
  authorName: string
  createdAt: Date
  updatedAt: Date
  likeCount: number
  likedByMe: boolean
  replyCount: number
  replies: BoardComment[]
}

export interface PagedResult<T> {
  items: T[]
  page: number
  size: number
  hasNext: boolean
}

export interface NotificationSubscription {
  subscriptionId: number
  companyId: number | null
  companyName: string
  createdAt: Date
}

export interface UserNotification {
  notificationId: number
  companyId: number | null
  companyName: string
  eventDate: Date | null
  firstReporterNickname: string
  reporterMessage: string | null
  reporterCount: number
  summaryText: string
  read: boolean
  createdAt: Date
  updatedAt: Date
}
