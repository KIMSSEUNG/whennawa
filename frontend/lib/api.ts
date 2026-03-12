import { mockCompanies, mockUser } from "./mock-data"
import type {
  ChatMessage,
  CompanyNameRequestItem,
  CompanyRequestStatus,
  BoardComment,
  BoardPost,
  CompanyCreateResult,
  CompanySearchItem,
  CompanyStatus,
  CompanyTimeline,
  InterviewDifficulty,
  InterviewReview,
  InterviewReviewSort,
  KeywordLeadTime,
  NotificationSubscription,
  PagedResult,
  RollingPrediction,
  ReportItem,
  ReportStatus,
  ReportStep,
  RecruitmentMode,
  RollingReportType,
  UserNotification,
  UserBlockItem,
  User,
} from "./types"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type CompanySearchItemInput = {
  companyName: string
  lastResultAt: Date | string | null
}

type CompanyStatusInput = {
  companyId: number | null
  companyName: string
  regularReports?: Array<{
    year: number
    steps: Array<{
      eventType: string
      label: string
      occurredAt: Date | string
      diffDays: number | null
    }>
  }>
  regularTimelines?: Array<{
    year: number
    steps: Array<{
      eventType: string
      label: string
      occurredAt: Date | string
      diffDays: number | null
    }>
  }>
  timelines?: Array<{
    year: number
    steps: Array<{
      eventType: string
      label: string
      occurredAt: Date | string
      diffDays: number | null
    }>
  }>
  internReports?: Array<{
    year: number
    steps: Array<{
      eventType: string
      label: string
      occurredAt: Date | string
      diffDays: number | null
    }>
  }>
  internTimelines?: Array<{
    year: number
    steps: Array<{
      eventType: string
      label: string
      occurredAt: Date | string
      diffDays: number | null
    }>
  }>
  rollingReports?: Array<{
    stepName: string
    sampleCount: number
    noResponseCount: number
    avgDays: number | null
    minDays: number | null
    maxDays: number | null
  }>
  rollingSteps?: Array<{
    stepName: string
    sampleCount: number
    noResponseCount: number
    avgDays: number | null
    minDays: number | null
    maxDays: number | null
  }>
  interviewReviews?: InterviewReviewInput[]
}

type CompanyCreateResultInput = {
  companyId: number | null
  requestId: number | null
  companyName: string
  originalCompanyName: string
  created: boolean
  pending: boolean
  normalizedChanged: boolean
  message: string | null
}

type KeywordLeadTimeInput = {
  keyword: string
  medianDays: number | null
  minDays: number | null
  maxDays: number | null
}

type ReportStepInput = {
  stepId: number
  stepName: string
}

type ReportItemInput = {
  reportId: number
  reportCount: number
  companyName: string
  recruitmentMode: RecruitmentMode
  rollingResultType: RollingReportType | null
  prevReportedDate: Date | string | null
  prevStepName: string | null
  currentStepName: string | null
  reportedDate: Date | string | null
  status: ReportStatus
  jobCategoryId: number | null
  jobCategoryName: string | null
  otherJobName: string | null
  interviewReviewContent: string | null
  interviewDifficulty: InterviewDifficulty | null
  onHold: boolean
}

type ReportAssignBatchResponseInput = {
  updatedCount: number
}

type CompanyNameRequestItemInput = {
  requestId: number
  originalCompanyName: string
  normalizedCompanyName: string
  requestCount: number
  status: CompanyRequestStatus
  alreadyExists: boolean
  existingCompanyName: string | null
  message: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

type ChatMessageInput = {
  companyId: number
  senderUserId: number | null
  senderNickname: string
  message: string
  timestamp: Date | string
}

type ChatJoinResponseInput = {
  nickname: string
}

type UserBlockItemInput = {
  userId: number
  email: string
  nickname: string
}

type BoardPostInput = {
  postId: number
  companyId: number
  companyName: string
  title: string
  content: string
  authorUserId: number | null
  authorName: string
  createdAt: Date | string
}

type BoardCommentInput = {
  commentId: number
  postId: number
  parentCommentId: number | null
  content: string
  authorUserId: number | null
  authorName: string
  createdAt: Date | string
  updatedAt: Date | string
  likeCount: number
  likedByMe: boolean
  replyCount: number
  replies: BoardCommentInput[]
}

type BoardPageInput<T> = {
  items: T[]
  page: number
  size: number
  hasNext: boolean
  totalPages?: number
  totalElements?: number
}

type NotificationSubscriptionInput = {
  subscriptionId: number
  companyId: number | null
  companyName: string
  createdAt: Date | string
}

type UserNotificationInput = {
  notificationId: number
  companyId: number | null
  companyName: string
  eventDate: Date | string | null
  firstReporterNickname: string
  reporterMessage: string | null
  reporterCount: number
  summaryText: string
  read: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

type InterviewReviewInput = {
  reviewId: number
  companyId: number | null
  companyName: string | null
  recruitmentMode: RecruitmentMode
  stepName: string
  difficulty: InterviewDifficulty
  content: string
  likeCount: number
  likedByMe: boolean
  createdAt: Date | string
}

type RollingPredictionInput = {
  stepName: string
  previousStepDate: Date | string
  sampleCount: number
  expectedDate: Date | string | null
  expectedStartDate: Date | string | null
  expectedEndDate: Date | string | null
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false"
const DEFAULT_ROLLING_STEP_CURRENT_SAMPLES = ["서류 발표", "코딩 테스트 발표", "1차 면접 발표", "2차 면접 발표", "최종 발표"]
const DEFAULT_ROLLING_STEP_PREV_SAMPLES = ["서류", "코딩 테스트", "1차 면접", "2차 면접", "최종 면접"]
const DEFAULT_ROLLING_STEP_PAIRS: Array<{ prev: string; current: string }> = [
  { prev: "서류", current: "서류 발표" },
  { prev: "코딩 테스트", current: "코딩 테스트 발표" },
  { prev: "1차 면접", current: "1차 면접 발표" },
  { prev: "2차 면접", current: "2차 면접 발표" },
  { prev: "최종 면접", current: "최종 발표" },
]
const DEFAULT_INTERN_STEP_CURRENT_SAMPLES = ["서류 발표", "코딩 테스트 발표", "1차 면접 발표", "최종 발표", "인턴 합격 발표"]
const DEFAULT_INTERN_STEP_PREV_SAMPLES = ["서류", "코딩 테스트", "1차 면접", "최종 면접", "인턴 지원"]
const DEFAULT_INTERN_STEP_PAIRS: Array<{ prev: string; current: string }> = [
  { prev: "서류", current: "서류 발표" },
  { prev: "코딩 테스트", current: "코딩 테스트 발표" },
  { prev: "1차 면접", current: "1차 면접 발표" },
  { prev: "최종 면접", current: "최종 발표" },
  { prev: "인턴 지원", current: "인턴 합격 발표" },
]
type UserInfoResponse = {
  userId: number
  email: string
  nickname?: string
  role?: "USER" | "ADMIN"
}

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))
const toDateOrNull = (value: Date | string | null | undefined) => (value ? toDate(value) : null)

const normalizeSearchCompany = (company: CompanySearchItemInput): CompanySearchItem => ({
  ...company,
  lastResultAt: toDateOrNull(company.lastResultAt),
})

const normalizeCompanyStatus = (status: CompanyStatusInput): CompanyStatus => ({
  companyId: status.companyId,
  companyName: status.companyName,
  regularTimelines: (status.regularReports ?? status.regularTimelines ?? status.timelines ?? []).map((unit) => ({
    ...unit,
    steps: unit.steps.map((step) => ({
      ...step,
      occurredAt: toDateOrNull(step.occurredAt),
    })),
  })),
  internTimelines: (status.internReports ?? status.internTimelines ?? []).map((unit) => ({
    ...unit,
    steps: unit.steps.map((step) => ({
      ...step,
      occurredAt: toDateOrNull(step.occurredAt),
    })),
  })),
  rollingSteps: (status.rollingReports ?? status.rollingSteps ?? []).map((item) => ({
    stepName: item.stepName,
    sampleCount: item.sampleCount ?? 0,
    noResponseCount: item.noResponseCount ?? 0,
    avgDays: item.avgDays,
    minDays: item.minDays,
    maxDays: item.maxDays,
  })),
  interviewReviews: (status.interviewReviews ?? []).map(normalizeInterviewReview),
})

const normalizeReportItem = (item: ReportItemInput): ReportItem => ({
  ...item,
  prevReportedDate: toDateOrNull(item.prevReportedDate),
  reportedDate: toDateOrNull(item.reportedDate),
})

const normalizeChatMessage = (item: ChatMessageInput): ChatMessage => ({
  ...item,
  timestamp: toDate(item.timestamp),
})

const normalizeUserBlockItem = (item: UserBlockItemInput): UserBlockItem => ({
  userId: item.userId,
  email: item.email,
  nickname: item.nickname,
})

const normalizeCompanyCreateResult = (item: CompanyCreateResultInput): CompanyCreateResult => ({
  ...item,
})

const normalizeCompanyNameRequestItem = (item: CompanyNameRequestItemInput): CompanyNameRequestItem => ({
  ...item,
  createdAt: toDate(item.createdAt),
  updatedAt: toDate(item.updatedAt),
})

const normalizeBoardPost = (item: BoardPostInput): BoardPost => ({
  ...item,
  createdAt: toDate(item.createdAt),
})

const normalizeBoardComment = (item: BoardCommentInput): BoardComment => ({
  ...item,
  createdAt: toDate(item.createdAt),
  updatedAt: toDate(item.updatedAt),
  replies: (item.replies ?? []).map(normalizeBoardComment),
})

const normalizeRollingPrediction = (item: RollingPredictionInput): RollingPrediction => ({
  ...item,
  previousStepDate: toDate(item.previousStepDate),
  expectedDate: toDateOrNull(item.expectedDate),
  expectedStartDate: toDateOrNull(item.expectedStartDate),
  expectedEndDate: toDateOrNull(item.expectedEndDate),
})

const normalizeInterviewReview = (item: InterviewReviewInput): InterviewReview => ({
  ...item,
  createdAt: toDate(item.createdAt),
})

const normalizeNotificationSubscription = (item: NotificationSubscriptionInput): NotificationSubscription => ({
  ...item,
  createdAt: toDate(item.createdAt),
})

const normalizeUserNotification = (item: UserNotificationInput): UserNotification => ({
  ...item,
  eventDate: toDateOrNull(item.eventDate),
  createdAt: toDate(item.createdAt),
  updatedAt: toDate(item.updatedAt),
})

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      const isMeEndpoint = path.startsWith("/api/auth/me")
      if (!isMeEndpoint && window.location.pathname !== "/login") {
        const hadSession = window.localStorage.getItem("had_session") === "1"
        const reason = hadSession ? "session_expired" : "auth_required"
        const next = `${window.location.pathname}${window.location.search}`
        window.location.replace(`/login?reason=${reason}&next=${encodeURIComponent(next)}`)
      }
    }
    const raw = await response.text()
    let message = raw
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { message?: string }
        if (parsed?.message && parsed.message.trim()) {
          message = parsed.message
        }
      } catch {
        // Keep raw text when response body is not JSON.
      }
    }
    throw new Error(message || `Request failed with ${response.status}`)
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem("had_session", "1")
  }
  return JSON.parse(text) as T
}

export async function getUser(): Promise<User | null> {
  try {
    if (USE_MOCK) {
      await delay(500)
      return mockUser
    }

    const data = await request<UserInfoResponse>("/api/auth/me")
    if (!data?.userId || !data.email) {
      return null
    }
    const displayName = data.nickname?.trim() || data.email?.split("@")[0] || "User"
    return { id: String(data.userId), email: data.email, name: displayName, role: data.role }
  } catch (error) {
    console.error("Failed to load user", error)
    throw error
  }
}

export async function searchCompanies(query: string, limit?: number): Promise<CompanySearchItem[]> {
  try {
    if (!query.trim()) return []

    if (USE_MOCK) {
      await delay(600)
      const lowerQuery = query.toLowerCase()
      return mockCompanies
        .filter((c) => c.companyName.toLowerCase().includes(lowerQuery))
        .map((company) => ({
          companyName: company.companyName,
          lastResultAt: toDate(company.lastUpdatedAt),
        }))
    }

    const params = new URLSearchParams({ query })
    if (limit) params.set("limit", String(limit))
    const data = await request<CompanySearchItemInput[]>(`/api/companies/search?${params.toString()}`)
    return data.map(normalizeSearchCompany)
  } catch (error) {
    console.error("Failed to search companies", error)
    return []
  }
}

export async function fetchCompanyStatus(companyName: string): Promise<CompanyStatus | null> {
  try {
    if (USE_MOCK) {
      await delay(400)
      return {
        companyId: 0,
        companyName,
        regularTimelines: [
          {
            year: new Date().getFullYear(),
            steps: [
              {
                eventType: "APPLIED",
                label: "서류 발표",
                occurredAt: new Date(),
                diffDays: null,
              },
            ],
          },
        ],
        internTimelines: [
          {
            year: new Date().getFullYear(),
            steps: [
              {
                eventType: "REPORTED",
                label: "인턴 서류 발표",
                occurredAt: new Date(),
                diffDays: 9,
              },
            ],
          },
        ],
        rollingSteps: [
          {
            stepName: "1차 면접 발표",
            sampleCount: 5,
            noResponseCount: 0,
            avgDays: 10,
            minDays: 7,
            maxDays: 14,
          },
        ],
      }
    }

    const data = await request<CompanyStatusInput>(`/api/companies/${encodeURIComponent(companyName)}/status`)
    return normalizeCompanyStatus(data)
  } catch (error) {
    console.error("Failed to fetch company timeline", error)
    return null
  }
}

export async function fetchCompanyTimeline(companyName: string): Promise<CompanyTimeline | null> {
  return fetchCompanyStatus(companyName)
}

export async function fetchCompanyLeadTime(
  companyName: string,
  keyword: string,
  mode: RecruitmentMode = "REGULAR",
): Promise<KeywordLeadTime | null> {
  try {
    if (USE_MOCK) {
      await delay(400)
      return {
        keyword,
        medianDays: 12,
        minDays: 8,
        maxDays: 18,
      }
    }

    const data = await request<KeywordLeadTimeInput>(
      `/api/companies/${encodeURIComponent(companyName)}/lead-time?q=${encodeURIComponent(keyword)}&mode=${encodeURIComponent(mode)}`,
    )
    return data
  } catch (error) {
    console.error("Failed to fetch company lead time", error)
    return null
  }
}

export async function fetchRollingPrediction(
  companyName: string,
  stepName: string,
  prevDate: string,
): Promise<RollingPrediction | null> {
  if (!companyName.trim() || !stepName.trim() || !prevDate) return null
  try {
    if (USE_MOCK) {
      await delay(200)
      const base = new Date(`${prevDate}T00:00:00+09:00`)
      const expected = new Date(base)
      expected.setDate(expected.getDate() + 10)
      const min = new Date(base)
      min.setDate(min.getDate() + 7)
      const max = new Date(base)
      max.setDate(max.getDate() + 14)
      return normalizeRollingPrediction({
        stepName,
        previousStepDate: base,
        sampleCount: 5,
        expectedDate: expected,
        expectedStartDate: min,
        expectedEndDate: max,
      })
    }

    const params = new URLSearchParams({ stepName, prevDate })
    const data = await request<RollingPredictionInput>(
      `/api/companies/${encodeURIComponent(companyName)}/rolling-predict?${params.toString()}`,
    )
    return data ? normalizeRollingPrediction(data) : null
  } catch (error) {
    console.error("Failed to fetch rolling prediction", error)
    return null
  }
}

export async function fetchChatMessages(companyId: number, limit = 200): Promise<ChatMessage[]> {
  if (!Number.isFinite(companyId) || companyId <= 0) return []
  if (USE_MOCK) {
    await delay(120)
    return []
  }
  const params = new URLSearchParams({ limit: String(limit) })
  const data = await request<ChatMessageInput[]>(`/api/chat/room/${companyId}/messages?${params.toString()}`)
  return (data ?? []).map(normalizeChatMessage)
}

export async function fetchBlockedUsers(): Promise<UserBlockItem[]> {
  if (USE_MOCK) {
    await delay(100)
    return []
  }
  const data = await request<UserBlockItemInput[]>("/api/users/blocks")
  return (data ?? []).map(normalizeUserBlockItem)
}

export async function blockUser(targetUserId: number): Promise<void> {
  await request<void>(`/api/users/blocks/${targetUserId}`, { method: "POST" })
}

export async function unblockUser(targetUserId: number): Promise<void> {
  await request<void>(`/api/users/blocks/${targetUserId}`, { method: "DELETE" })
}

export async function createCompany(companyName: string): Promise<CompanyCreateResult> {
  if (USE_MOCK) {
    await delay(200)
    return {
      companyId: null,
      requestId: Math.floor(Math.random() * 100000),
      companyName,
      originalCompanyName: companyName,
      created: false,
      pending: true,
      normalizedChanged: false,
      message: "?뚯궗 ?깅줉 ?붿껌 媛먯궗?⑸땲?? 泥섎━?먮뒗 ?쇱젙 ?쒓컙???꾩슂?????덉뒿?덈떎.",
    }
  }
  const data = await request<CompanyCreateResultInput>("/api/companies", {
    method: "POST",
    body: JSON.stringify({ companyName }),
  })
  return normalizeCompanyCreateResult(data)
}

export async function fetchBoardPosts(
  companyName: string,
  page = 0,
  size = 20,
): Promise<PagedResult<BoardPost>> {
  if (!companyName.trim()) return { items: [], page: 0, size, hasNext: false }
  if (USE_MOCK) {
    await delay(150)
    return { items: [], page, size, hasNext: false }
  }
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const data = await request<BoardPageInput<BoardPostInput>>(
    `/api/boards/${encodeURIComponent(companyName)}/posts?${params.toString()}`,
  )
  return {
    items: (data.items ?? []).map(normalizeBoardPost),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
    totalPages: data.totalPages,
    totalElements: data.totalElements,
  }
}

export async function fetchBoardPost(companyName: string, postId: number): Promise<BoardPost> {
  const data = await request<BoardPostInput>(`/api/boards/${encodeURIComponent(companyName)}/posts/${postId}`)
  return normalizeBoardPost(data)
}

export async function createBoardPost(
  companyName: string,
  title: string,
  content: string,
  options?: { anonymous?: boolean },
): Promise<BoardPost> {
  if (USE_MOCK) {
    await delay(150)
    return {
      postId: Math.floor(Math.random() * 100000),
      companyId: 0,
      companyName,
      title,
      content,
      authorUserId: 0,
      authorName: "mock",
      createdAt: new Date(),
    }
  }
  const data = await request<BoardPostInput>(`/api/boards/${encodeURIComponent(companyName)}/posts`, {
    method: "POST",
    body: JSON.stringify({ title, content, anonymous: Boolean(options?.anonymous) }),
  })
  return normalizeBoardPost(data)
}

export async function searchBoardPosts(
  companyName: string,
  query: string,
  field: "title" | "content",
  page = 0,
  size = 20,
): Promise<PagedResult<BoardPost>> {
  if (!companyName.trim() || !query.trim()) return { items: [], page: 0, size, hasNext: false }
  if (USE_MOCK) {
    await delay(150)
    return { items: [], page, size, hasNext: false }
  }
  const params = new URLSearchParams({ q: query, field, page: String(page), size: String(size) })
  const data = await request<BoardPageInput<BoardPostInput>>(
    `/api/boards/${encodeURIComponent(companyName)}/posts/search?${params.toString()}`,
  )
  return {
    items: (data.items ?? []).map(normalizeBoardPost),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
    totalPages: data.totalPages,
    totalElements: data.totalElements,
  }
}

export async function updateBoardPost(companyName: string, postId: number, title: string, content: string): Promise<BoardPost> {
  const data = await request<BoardPostInput>(`/api/boards/${encodeURIComponent(companyName)}/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify({ title, content }),
  })
  return normalizeBoardPost(data)
}

export async function deleteBoardPost(companyName: string, postId: number): Promise<void> {
  await request<void>(`/api/boards/${encodeURIComponent(companyName)}/posts/${postId}`, {
    method: "DELETE",
  })
}

export async function fetchBoardComments(
  companyName: string,
  postId: number,
  page = 0,
  size = 20,
): Promise<PagedResult<BoardComment>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const data = await request<BoardPageInput<BoardCommentInput>>(
    `/api/boards/${encodeURIComponent(companyName)}/posts/${postId}/comments?${params.toString()}`,
  )
  return {
    items: (data.items ?? []).map(normalizeBoardComment),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
  }
}

export async function createBoardComment(
  companyName: string,
  postId: number,
  content: string,
  parentCommentId?: number | null,
  options?: { anonymous?: boolean },
): Promise<BoardComment> {
  const data = await request<BoardCommentInput>(
    `/api/boards/${encodeURIComponent(companyName)}/posts/${postId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({
        content,
        parentCommentId: parentCommentId ?? null,
        anonymous: Boolean(options?.anonymous),
      }),
    },
  )
  return normalizeBoardComment(data)
}

export async function joinChatRoom(companyId: number): Promise<{ nickname: string }> {
  if (USE_MOCK) {
    await delay(120)
    return { nickname: `user#${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}` }
  }
  const data = await request<ChatJoinResponseInput>(`/api/chat/room/${companyId}/join`, {
    method: "POST",
  })
  return { nickname: data.nickname }
}

export async function updateBoardComment(
  companyName: string,
  postId: number,
  commentId: number,
  content: string,
): Promise<BoardComment> {
  const data = await request<BoardCommentInput>(
    `/api/boards/${encodeURIComponent(companyName)}/posts/${postId}/comments/${commentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    },
  )
  return normalizeBoardComment(data)
}

export async function deleteBoardComment(companyName: string, postId: number, commentId: number): Promise<void> {
  await request<void>(
    `/api/boards/${encodeURIComponent(companyName)}/posts/${postId}/comments/${commentId}`,
    { method: "DELETE" },
  )
}

export async function likeBoardComment(companyName: string, postId: number, commentId: number): Promise<BoardComment> {
  const data = await request<BoardCommentInput>(
    `/api/boards/${encodeURIComponent(companyName)}/posts/${postId}/comments/${commentId}/like`,
    { method: "POST" },
  )
  return normalizeBoardComment(data)
}

export async function unlikeBoardComment(
  companyName: string,
  postId: number,
  commentId: number,
): Promise<BoardComment> {
  const data = await request<BoardCommentInput>(
    `/api/boards/${encodeURIComponent(companyName)}/posts/${postId}/comments/${commentId}/like`,
    { method: "DELETE" },
  )
  return normalizeBoardComment(data)
}

export async function fetchCareerBoardPosts(page = 0, size = 20): Promise<PagedResult<BoardPost>> {
  if (USE_MOCK) {
    await delay(150)
    return { items: [], page, size, hasNext: false, totalPages: 0, totalElements: 0 }
  }
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const data = await request<BoardPageInput<BoardPostInput>>(`/api/career-board/posts?${params.toString()}`)
  return {
    items: (data.items ?? []).map(normalizeBoardPost),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
    totalPages: data.totalPages,
    totalElements: data.totalElements,
  }
}

export async function searchCareerBoardPosts(
  query: string,
  field: "title" | "content",
  page = 0,
  size = 20,
): Promise<PagedResult<BoardPost>> {
  if (!query.trim()) return { items: [], page: 0, size, hasNext: false, totalPages: 0, totalElements: 0 }
  if (USE_MOCK) {
    await delay(150)
    return { items: [], page, size, hasNext: false, totalPages: 0, totalElements: 0 }
  }
  const params = new URLSearchParams({ q: query, field, page: String(page), size: String(size) })
  const data = await request<BoardPageInput<BoardPostInput>>(`/api/career-board/posts/search?${params.toString()}`)
  return {
    items: (data.items ?? []).map(normalizeBoardPost),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
    totalPages: data.totalPages,
    totalElements: data.totalElements,
  }
}

export async function fetchCareerBoardPost(postId: number): Promise<BoardPost> {
  const data = await request<BoardPostInput>(`/api/career-board/posts/${postId}`)
  return normalizeBoardPost(data)
}

export async function createCareerBoardPost(
  title: string,
  content: string,
  options?: { anonymous?: boolean },
): Promise<BoardPost> {
  if (USE_MOCK) {
    await delay(150)
    return {
      postId: Math.floor(Math.random() * 100000),
      companyId: 0,
      companyName: "취업고민",
      title,
      content,
      authorUserId: 0,
      authorName: "mock",
      createdAt: new Date(),
    }
  }
  const data = await request<BoardPostInput>(`/api/career-board/posts`, {
    method: "POST",
    body: JSON.stringify({ title, content, anonymous: Boolean(options?.anonymous) }),
  })
  return normalizeBoardPost(data)
}

export async function updateCareerBoardPost(postId: number, title: string, content: string): Promise<BoardPost> {
  const data = await request<BoardPostInput>(`/api/career-board/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify({ title, content }),
  })
  return normalizeBoardPost(data)
}

export async function deleteCareerBoardPost(postId: number): Promise<void> {
  await request<void>(`/api/career-board/posts/${postId}`, { method: "DELETE" })
}

export async function fetchCareerBoardComments(postId: number, page = 0, size = 20): Promise<PagedResult<BoardComment>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const data = await request<BoardPageInput<BoardCommentInput>>(`/api/career-board/posts/${postId}/comments?${params.toString()}`)
  return {
    items: (data.items ?? []).map(normalizeBoardComment),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
    totalPages: data.totalPages,
    totalElements: data.totalElements,
  }
}

export async function createCareerBoardComment(
  postId: number,
  content: string,
  parentCommentId?: number | null,
  options?: { anonymous?: boolean },
): Promise<BoardComment> {
  const data = await request<BoardCommentInput>(`/api/career-board/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      content,
      parentCommentId: parentCommentId ?? null,
      anonymous: Boolean(options?.anonymous),
    }),
  })
  return normalizeBoardComment(data)
}

export async function updateCareerBoardComment(postId: number, commentId: number, content: string): Promise<BoardComment> {
  const data = await request<BoardCommentInput>(`/api/career-board/posts/${postId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  })
  return normalizeBoardComment(data)
}

export async function deleteCareerBoardComment(postId: number, commentId: number): Promise<void> {
  await request<void>(`/api/career-board/posts/${postId}/comments/${commentId}`, { method: "DELETE" })
}

export async function likeCareerBoardComment(postId: number, commentId: number): Promise<BoardComment> {
  const data = await request<BoardCommentInput>(`/api/career-board/posts/${postId}/comments/${commentId}/like`, { method: "POST" })
  return normalizeBoardComment(data)
}

export async function unlikeCareerBoardComment(postId: number, commentId: number): Promise<BoardComment> {
  const data = await request<BoardCommentInput>(`/api/career-board/posts/${postId}/comments/${commentId}/like`, { method: "DELETE" })
  return normalizeBoardComment(data)
}

export async function fetchTopInterviewReviews(
  companyName: string,
  limit = 3,
  sort: InterviewReviewSort = "LIKES",
): Promise<InterviewReview[]> {
  if (!companyName.trim()) return []
  if (USE_MOCK) {
    await delay(120)
    return []
  }
  const params = new URLSearchParams({ limit: String(limit), sort })
  const data = await request<InterviewReviewInput[]>(
    `/api/companies/${encodeURIComponent(companyName)}/interview-reviews/top?${params.toString()}`,
  )
  return (data ?? []).map(normalizeInterviewReview)
}

export async function fetchInterviewReviews(
  companyName: string,
  page = 0,
  size = 20,
  sort: InterviewReviewSort = "LIKES",
  stepName?: string,
  mode?: RecruitmentMode,
): Promise<PagedResult<InterviewReview>> {
  if (!companyName.trim()) return { items: [], page: 0, size, hasNext: false }
  if (USE_MOCK) {
    await delay(150)
    return { items: [], page, size, hasNext: false }
  }
  const params = new URLSearchParams({ page: String(page), size: String(size), sort })
  if (stepName?.trim()) {
    params.set("stepName", stepName.trim())
  }
  if (mode) {
    params.set("mode", mode)
  }
  const data = await request<BoardPageInput<InterviewReviewInput>>(
    `/api/companies/${encodeURIComponent(companyName)}/interview-reviews?${params.toString()}`,
  )
  return {
    items: (data.items ?? []).map(normalizeInterviewReview),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
  }
}

export async function fetchInterviewReviewSteps(companyName: string, mode?: RecruitmentMode): Promise<string[]> {
  if (!companyName.trim()) return []
  if (USE_MOCK) {
    await delay(100)
    return []
  }
  const params = new URLSearchParams()
  if (mode) {
    params.set("mode", mode)
  }
  const qs = params.toString()
  const data = await request<string[]>(
    `/api/companies/${encodeURIComponent(companyName)}/interview-reviews/steps${qs ? `?${qs}` : ""}`,
  )
  return (data ?? []).map((value) => value?.trim()).filter((value): value is string => Boolean(value))
}

export async function likeInterviewReview(reviewId: number): Promise<InterviewReview> {
  const data = await request<InterviewReviewInput>(`/api/interview-reviews/${reviewId}/like`, { method: "POST" })
  return normalizeInterviewReview(data)
}

export async function unlikeInterviewReview(reviewId: number): Promise<InterviewReview> {
  const data = await request<InterviewReviewInput>(`/api/interview-reviews/${reviewId}/like`, { method: "DELETE" })
  return normalizeInterviewReview(data)
}

export type ReportCreateRequest = {
  companyName: string
  recruitmentMode: RecruitmentMode
  jobCategoryId?: number
  rollingJobName?: string
  otherJobName?: string | null
  rollingResultType?: RollingReportType | null
  prevReportedDate?: string | null
  prevStepName?: string | null
  currentStepName?: string | null
  reportedDate?: string | null
  notificationMessage?: string | null
  todayAnnouncement?: boolean
  interviewReviewContent?: string | null
  interviewDifficulty?: InterviewDifficulty | null
}

type JobCategoryItemInput = {
  jobCategoryId: number
  name: string
}

export type ReportJobCategory = {
  jobCategoryId: number
  jobCategoryName: string
}

const OTHER_JOB_CATEGORY_NAME = "\uAE30\uD0C0"

function sortJobCategoriesWithOtherLast(items: ReportJobCategory[]): ReportJobCategory[] {
  return [...items].sort((a, b) => {
    const aIsOther = a.jobCategoryName.trim() === OTHER_JOB_CATEGORY_NAME
    const bIsOther = b.jobCategoryName.trim() === OTHER_JOB_CATEGORY_NAME
    if (aIsOther && !bIsOther) return 1
    if (!aIsOther && bIsOther) return -1
    return a.jobCategoryId - b.jobCategoryId
  })
}

let reportJobCategoriesCache: ReportJobCategory[] | null = null
let reportJobCategoriesCacheFetchedAt = 0
let reportJobCategoriesPending: Promise<ReportJobCategory[]> | null = null
const REPORT_JOB_CATEGORY_CACHE_TTL_MS = 10 * 60 * 1000

export async function fetchReportJobCategories(companyName?: string): Promise<ReportJobCategory[]> {
  if (USE_MOCK) {
    await delay(120)
    return sortJobCategoriesWithOtherLast([
      { jobCategoryId: 1, jobCategoryName: "\uAC1C\uBC1C" },
      { jobCategoryId: 2, jobCategoryName: "\uD504\uB860\uD2B8\uC5D4\uB4DC" },
      { jobCategoryId: 3, jobCategoryName: "\uBC31\uC5D4\uB4DC" },
    ])
  }

  const now = Date.now()
  if (reportJobCategoriesCache && now - reportJobCategoriesCacheFetchedAt < REPORT_JOB_CATEGORY_CACHE_TTL_MS) {
    return reportJobCategoriesCache
  }
  if (reportJobCategoriesPending) {
    return reportJobCategoriesPending
  }

  reportJobCategoriesPending = request<JobCategoryItemInput[]>("/api/reports/job-categories")
    .then((data) => {
      const normalized = sortJobCategoriesWithOtherLast(
        (data ?? [])
          .map((item) => ({
            jobCategoryId: item.jobCategoryId,
            jobCategoryName: item.name,
          }))
          .filter((item) => Number.isFinite(item.jobCategoryId) && !!item.jobCategoryName?.trim())
          .filter((item) => item.jobCategoryName.trim() !== OTHER_JOB_CATEGORY_NAME)
      )
      reportJobCategoriesCache = normalized
      reportJobCategoriesCacheFetchedAt = Date.now()
      return normalized
    })
    .catch(() => reportJobCategoriesCache ?? [])
    .finally(() => {
      reportJobCategoriesPending = null
    })

  return reportJobCategoriesPending
}

export async function fetchReportSteps(
  companyName: string,
): Promise<ReportStep[]> {
  if (!companyName.trim()) return []
  if (USE_MOCK) {
    await delay(200)
    return [
      { stepId: 1, stepName: "서류 발표" },
      { stepId: 2, stepName: "코딩 테스트 발표" },
      { stepId: 3, stepName: "1차 면접 발표" },
    ]
  }
  const params = new URLSearchParams({ companyName })
  const data = await request<ReportStepInput[]>(`/api/reports/steps?${params.toString()}`)
  return data
}

export async function fetchRollingReportCurrentStepNames(
  companyName?: string,
  query?: string,
  mode: RecruitmentMode = "ROLLING",
  options?: { jobCategoryId?: number | null },
): Promise<string[]> {
  if (USE_MOCK) {
    await delay(120)
  }
  const normalizedQuery = query?.trim().toLowerCase() ?? ""
  const fallback = mode === "INTERN" ? DEFAULT_INTERN_STEP_CURRENT_SAMPLES : DEFAULT_ROLLING_STEP_CURRENT_SAMPLES
  if (USE_MOCK) {
    if (!normalizedQuery) return fallback
    return fallback.filter((name) => name.toLowerCase().includes(normalizedQuery))
  }
  try {
    const params = new URLSearchParams()
    if (companyName?.trim()) params.set("companyName", companyName.trim())
    if (normalizedQuery) params.set("q", normalizedQuery)
    params.set("mode", mode)
    params.set("kind", "CURRENT")
    if (options?.jobCategoryId != null) params.set("jobCategoryId", String(options.jobCategoryId))
    const data = await request<string[]>(`/api/reports/rolling-steps?${params.toString()}`)
    if (Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch {
    // fall back to built-in defaults when API is unavailable
  }
  if (!normalizedQuery) return fallback
  return fallback.filter((name) => name.toLowerCase().includes(normalizedQuery))
}

export async function fetchRollingReportPrevStepNames(
  companyName?: string,
  query?: string,
  mode: RecruitmentMode = "ROLLING",
  options?: { jobCategoryId?: number | null },
): Promise<string[]> {
  if (USE_MOCK) {
    await delay(120)
  }
  const normalizedQuery = query?.trim().toLowerCase() ?? ""
  const fallback = mode === "INTERN" ? DEFAULT_INTERN_STEP_PREV_SAMPLES : DEFAULT_ROLLING_STEP_PREV_SAMPLES
  if (USE_MOCK) {
    if (!normalizedQuery) return fallback
    return fallback.filter((name) => name.toLowerCase().includes(normalizedQuery))
  }
  try {
    const params = new URLSearchParams()
    if (companyName?.trim()) params.set("companyName", companyName.trim())
    if (normalizedQuery) params.set("q", normalizedQuery)
    params.set("mode", mode)
    params.set("kind", "PREV")
    if (options?.jobCategoryId != null) params.set("jobCategoryId", String(options.jobCategoryId))
    const data = await request<string[]>(`/api/reports/rolling-steps?${params.toString()}`)
    if (Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch {
    // fall back to built-in defaults when API is unavailable
  }
  if (!normalizedQuery) return fallback
  return fallback.filter((name) => name.toLowerCase().includes(normalizedQuery))
}

export async function resolveRollingStepPair(
  direction: "prev_to_current" | "current_to_prev",
  stepName: string,
  mode: RecruitmentMode = "ROLLING",
  options?: { companyName?: string; jobCategoryId?: number | null },
): Promise<string | null> {
  const target = stepName.trim()
  if (!target) return null

  if (!USE_MOCK && options?.companyName?.trim()) {
    try {
      const params = new URLSearchParams({
        companyName: options.companyName.trim(),
        direction,
        stepName: target,
      })
      if (options.jobCategoryId != null) {
        params.set("jobCategoryId", String(options.jobCategoryId))
      }
      const data = await request<string | null>(`/api/reports/rolling-step-pair?${params.toString()}`)
      if (typeof data === "string" && data.trim()) {
        return data.trim()
      }
    } catch {
      // fall through to syntax fallback
    }
  }

  if (direction === "prev_to_current") {
    if (target.endsWith("발표")) return null
    return `${target} 발표`
  }
  if (direction === "current_to_prev") {
    if (!target.endsWith("발표")) return null
    const base = target.replace(/\s*발표$/, "").trim()
    return base || null
  }
  return null
}

export async function createReport(payload: ReportCreateRequest): Promise<{ reportId: number }> {
  if (USE_MOCK) {
    await delay(300)
    return { reportId: Math.floor(Math.random() * 10000) }
  }
  return await request<{ reportId: number }>("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function fetchNotificationSubscriptions(
  page = 0,
  size = 20,
): Promise<PagedResult<NotificationSubscription>> {
  if (USE_MOCK) {
    await delay(120)
    return { items: [], page, size, hasNext: false }
  }
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const data = await request<BoardPageInput<NotificationSubscriptionInput>>(
    `/api/notifications/subscriptions?${params.toString()}`,
  )
  return {
    items: (data.items ?? []).map(normalizeNotificationSubscription),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
  }
}

export async function createNotificationSubscription(companyName: string): Promise<NotificationSubscription> {
  const data = await request<NotificationSubscriptionInput>("/api/notifications/subscriptions", {
    method: "POST",
    body: JSON.stringify({ companyName }),
  })
  return normalizeNotificationSubscription(data)
}

export async function deleteNotificationSubscription(subscriptionId: number): Promise<void> {
  await request<void>(`/api/notifications/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  })
}

export async function fetchNotifications(page = 0, size = 20): Promise<PagedResult<UserNotification>> {
  if (USE_MOCK) {
    await delay(120)
    return { items: [], page, size, hasNext: false }
  }
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const data = await request<BoardPageInput<UserNotificationInput>>(`/api/notifications?${params.toString()}`)
  return {
    items: (data.items ?? []).map(normalizeUserNotification),
    page: data.page ?? page,
    size: data.size ?? size,
    hasNext: Boolean(data.hasNext),
  }
}

export async function deleteNotification(notificationId: number): Promise<void> {
  await request<void>(`/api/notifications/${notificationId}`, {
    method: "DELETE",
  })
}

export async function fetchAdminReports(status?: ReportStatus, scope: AdminReportScope = "regular"): Promise<ReportItem[]> {
  if (USE_MOCK) {
    await delay(300)
    return [
      {
        reportId: 1,
        reportCount: 3,
        companyName: "Naver",
        recruitmentMode: "REGULAR",
        rollingResultType: null,
        prevReportedDate: null,
        prevStepName: null,
        currentStepName: null,
        reportedDate: new Date(),
        status: "PENDING",
        jobCategoryId: 1,
        jobCategoryName: "개발",
        otherJobName: null,
        interviewReviewContent: null,
        interviewDifficulty: null,
        onHold: false,
      },
      {
        reportId: 2,
        reportCount: 1,
        companyName: "Kakao",
        recruitmentMode: "ROLLING",
        rollingResultType: "DATE_REPORTED",
        prevReportedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
        prevStepName: "서류",
        currentStepName: "1차 면접 발표",
        reportedDate: new Date(),
        status: "PENDING",
        jobCategoryId: 999,
        jobCategoryName: "기타",
        otherJobName: "데이터플랫폼",
        interviewReviewContent: null,
        interviewDifficulty: null,
        onHold: false,
      },
    ]
  }
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  const qs = params.toString()
  const data = await request<ReportItemInput[]>(`/api/admin/reports${adminReportScopePath(scope)}${qs ? `?${qs}` : ""}`)
  return data.map(normalizeReportItem)
}

export async function fetchAdminReportSteps(reportId: number): Promise<ReportStep[]> {
  if (USE_MOCK) {
    await delay(200)
    return [
      { stepId: 1, stepName: "서류 발표" },
      { stepId: 2, stepName: "코딩 테스트 발표" },
      { stepId: 3, stepName: "1차 면접 발표" },
    ]
  }
  return await request<ReportStepInput[]>(`/api/admin/reports/${reportId}/steps`)
}

export type ReportUpdateRequest = {
  companyName: string
  recruitmentMode: RecruitmentMode
  jobCategoryId?: number
  rollingJobName?: string
  otherJobName?: string
  rollingResultType?: RollingReportType | null
  prevReportedDate?: string | null
  prevStepName?: string | null
  currentStepName?: string | null
  reportedDate?: string | null
}

type AdminReportScope = "regular" | "rolling"

const adminReportScopePath = (scope: AdminReportScope) => (scope === "rolling" ? "/rolling" : "/regular")

export async function updateAdminReport(
  reportId: number,
  payload: ReportUpdateRequest,
  scope: AdminReportScope = "regular",
): Promise<ReportItem> {
  if (USE_MOCK) {
    await delay(300)
    return {
      reportId,
      reportCount: 1,
      companyName: payload.companyName,
      recruitmentMode: payload.recruitmentMode,
      rollingResultType: payload.rollingResultType ?? null,
      prevReportedDate: payload.prevReportedDate ? new Date(payload.prevReportedDate) : null,
      prevStepName: payload.prevStepName ?? null,
      currentStepName: payload.currentStepName ?? null,
      reportedDate: payload.reportedDate ? new Date(payload.reportedDate) : null,
      status: "PENDING",
      jobCategoryId: null,
      jobCategoryName: null,
      otherJobName: null,
      interviewReviewContent: null,
      interviewDifficulty: null,
      onHold: false,
    }
  }
  const data = await request<ReportItemInput>(`/api/admin/reports${adminReportScopePath(scope)}/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  return normalizeReportItem(data)
}

export async function processAdminReport(reportId: number, scope: AdminReportScope = "regular"): Promise<ReportItem> {
  if (USE_MOCK) {
    await delay(300)
    return {
      reportId,
      reportCount: 1,
      companyName: "Processed",
      recruitmentMode: "REGULAR",
      rollingResultType: null,
      prevReportedDate: null,
      prevStepName: null,
      currentStepName: null,
      reportedDate: new Date(),
      status: "PROCESSED",
      jobCategoryId: null,
      jobCategoryName: null,
      otherJobName: null,
      interviewReviewContent: null,
      interviewDifficulty: null,
      onHold: false,
    }
  }
  const data = await request<ReportItemInput>(`/api/admin/reports${adminReportScopePath(scope)}/${reportId}/process`, {
    method: "POST",
  })
  return normalizeReportItem(data)
}

export async function assignAdminReport(reportId: number, scope: AdminReportScope = "regular"): Promise<ReportItem> {
  if (USE_MOCK) {
    await delay(200)
    return {
      reportId,
      reportCount: 1,
      companyName: "Assigned",
      recruitmentMode: "REGULAR",
      rollingResultType: null,
      prevReportedDate: null,
      prevStepName: null,
      currentStepName: null,
      reportedDate: new Date(),
      status: "PENDING",
      jobCategoryId: null,
      jobCategoryName: null,
      otherJobName: null,
      interviewReviewContent: null,
      interviewDifficulty: null,
      onHold: false,
    }
  }
  const data = await request<ReportItemInput>(`/api/admin/reports${adminReportScopePath(scope)}/${reportId}/assign`, {
    method: "POST",
  })
  return normalizeReportItem(data)
}

export async function assignAllPendingAdminReports(scope: AdminReportScope = "regular"): Promise<{ updatedCount: number }> {
  if (USE_MOCK) {
    await delay(250)
    return { updatedCount: 0 }
  }
  const data = await request<ReportAssignBatchResponseInput>(`/api/admin/reports${adminReportScopePath(scope)}/assign-pending`, {
    method: "POST",
  })
  return { updatedCount: data.updatedCount ?? 0 }
}

export async function discardAdminReport(reportId: number, scope: AdminReportScope = "regular"): Promise<ReportItem> {
  if (USE_MOCK) {
    await delay(200)
    return {
      reportId,
      reportCount: 1,
      companyName: "Discarded",
      recruitmentMode: "REGULAR",
      rollingResultType: null,
      prevReportedDate: null,
      prevStepName: null,
      currentStepName: null,
      reportedDate: new Date(),
      status: "DISCARDED",
      jobCategoryId: null,
      jobCategoryName: null,
      otherJobName: null,
      interviewReviewContent: null,
      interviewDifficulty: null,
      onHold: false,
    }
  }
  const data = await request<ReportItemInput>(`/api/admin/reports${adminReportScopePath(scope)}/${reportId}/discard`, {
    method: "POST",
  })
  return normalizeReportItem(data)
}

export async function fetchAdminCompanyNameRequests(status?: CompanyRequestStatus): Promise<CompanyNameRequestItem[]> {
  if (USE_MOCK) {
    await delay(250)
    return []
  }
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  const qs = params.toString()
  const data = await request<CompanyNameRequestItemInput[]>(`/api/admin/company-requests${qs ? `?${qs}` : ""}`)
  return (data ?? []).map(normalizeCompanyNameRequestItem)
}

export async function updateAdminCompanyNameRequest(requestId: number, companyName: string): Promise<CompanyNameRequestItem> {
  if (USE_MOCK) {
    await delay(200)
    return {
      requestId,
      originalCompanyName: companyName,
      normalizedCompanyName: companyName,
      requestCount: 1,
      status: "PENDING",
      alreadyExists: false,
      existingCompanyName: null,
      message: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
  const data = await request<CompanyNameRequestItemInput>(`/api/admin/company-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify({ companyName }),
  })
  return normalizeCompanyNameRequestItem(data)
}

export async function processAdminCompanyNameRequest(requestId: number): Promise<CompanyNameRequestItem> {
  if (USE_MOCK) {
    await delay(220)
    return {
      requestId,
      originalCompanyName: "Sample",
      normalizedCompanyName: "Sample",
      requestCount: 1,
      status: "PROCESSED",
      alreadyExists: false,
      existingCompanyName: null,
      message: "?뚯궗 ?깅줉???꾨즺?섏뿀?듬땲??",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
  const data = await request<CompanyNameRequestItemInput>(`/api/admin/company-requests/${requestId}/process`, {
    method: "POST",
  })
  return normalizeCompanyNameRequestItem(data)
}

export async function discardAdminCompanyNameRequest(requestId: number): Promise<CompanyNameRequestItem> {
  if (USE_MOCK) {
    await delay(200)
    return {
      requestId,
      originalCompanyName: "Sample",
      normalizedCompanyName: "Sample",
      requestCount: 1,
      status: "DISCARDED",
      alreadyExists: false,
      existingCompanyName: null,
      message: "?붿껌???먭린?섏뿀?듬땲??",
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
  const data = await request<CompanyNameRequestItemInput>(`/api/admin/company-requests/${requestId}/discard`, {
    method: "POST",
  })
  return normalizeCompanyNameRequestItem(data)
}

export async function loginWithGoogle(nextPath?: string): Promise<boolean> {
  try {
    if (USE_MOCK) {
      await delay(1000)
      return true
    }

    if (!API_BASE_URL) {
      throw new Error("Missing NEXT_PUBLIC_API_BASE_URL")
    }

    if (typeof window !== "undefined") {
      const safeNext = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/"
      window.location.assign(`${API_BASE_URL}/api/auth/login/google?force_consent=1&next=${encodeURIComponent(safeNext)}`)
      return false
    }

    return false
  } catch (error) {
    console.error("Failed to login", error)
    throw error
  }
}

export async function logout(): Promise<void> {
  try {
    if (USE_MOCK) {
      await delay(300)
      return
    }

    await request<void>("/api/auth/logout", { method: "POST" })
  } catch (error) {
    console.error("Failed to logout", error)
  } finally {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("had_session")
      window.localStorage.setItem("session_version", String(Date.now()))
      window.dispatchEvent(new Event("session_update"))
    }
  }
}

export async function withdraw(): Promise<void> {
  try {
    if (USE_MOCK) {
      await delay(300)
      return
    }

    await request<void>("/api/auth/withdraw", { method: "DELETE" })
  } catch (error) {
    console.error("Failed to withdraw", error)
    throw error
  }
}









