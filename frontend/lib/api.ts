import { mockCompanies, mockUser } from "./mock-data"
import type {
  ChatMessage,
  CompanyNameRequestItem,
  CompanyRequestStatus,
  BoardComment,
  BoardPost,
  CompanyCreateResult,
  CompanySearchItem,
  CompanyTimeline,
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
  User,
} from "./types"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type CompanySearchItemInput = {
  companyName: string
  lastResultAt: Date | string | null
}

type CompanyTimelineInput = {
  companyId: number | null
  companyName: string
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
  internTimelines?: Array<{
    year: number
    steps: Array<{
      eventType: string
      label: string
      occurredAt: Date | string
      diffDays: number | null
    }>
  }>
  rollingSteps?: Array<{
    stepName: string
    sampleCount: number
    noResponseCount: number
    avgDays: number | null
    minDays: number | null
    maxDays: number | null
  }>
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
  senderNickname: string
  message: string
  timestamp: Date | string
}

type ChatJoinResponseInput = {
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
const ROLLING_STEP_CURRENT_SAMPLES_TXT_PATH = "/data/rolling-step-samples.txt"
const ROLLING_STEP_PREV_SAMPLES_TXT_PATH = "/data/rolling-step-prev-samples.txt"
const ROLLING_STEP_PAIRS_TXT_PATH = "/data/rolling-step-pairs.txt"
const INTERN_STEP_CURRENT_SAMPLES_TXT_PATH = "/data/intern-step-samples.txt"
const INTERN_STEP_PREV_SAMPLES_TXT_PATH = "/data/intern-step-prev-samples.txt"
const INTERN_STEP_PAIRS_TXT_PATH = "/data/intern-step-pairs.txt"
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

const normalizeTimeline = (timeline: CompanyTimelineInput): CompanyTimeline => ({
  companyId: timeline.companyId,
  companyName: timeline.companyName,
  regularTimelines: (timeline.regularTimelines ?? timeline.timelines ?? []).map((unit) => ({
    ...unit,
    steps: unit.steps.map((step) => ({
      ...step,
      occurredAt: toDateOrNull(step.occurredAt),
    })),
  })),
  internTimelines: (timeline.internTimelines ?? []).map((unit) => ({
    ...unit,
    steps: unit.steps.map((step) => ({
      ...step,
      occurredAt: toDateOrNull(step.occurredAt),
    })),
  })),
  rollingSteps: (timeline.rollingSteps ?? []).map((item) => ({
    stepName: item.stepName,
    sampleCount: item.sampleCount ?? 0,
    noResponseCount: item.noResponseCount ?? 0,
    avgDays: item.avgDays,
    minDays: item.minDays,
    maxDays: item.maxDays,
  })),
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

function parseStepSamples(text: string): string[] {
  const unique = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    const sample = line.trim()
    if (!sample || sample.startsWith("#")) continue
    unique.add(sample)
  }
  return Array.from(unique)
}

function parseStepPairs(text: string): Array<{ prev: string; current: string }> {
  const unique = new Map<string, { prev: string; current: string }>()
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [prevRaw, currentRaw] = trimmed.split("|")
    const prev = prevRaw?.trim() ?? ""
    const current = currentRaw?.trim() ?? ""
    if (!prev || !current) continue
    unique.set(`${prev}||${current}`, { prev, current })
  }
  return Array.from(unique.values())
}

async function loadSamplesFromText(path: string, fallback: string[]): Promise<string[]> {
  if (typeof window === "undefined") {
    return fallback
  }
  try {
    const response = await fetch(path, { cache: "no-store" })
    if (!response.ok) return fallback
    const text = await response.text()
    const parsed = parseStepSamples(text)
    return parsed.length > 0 ? parsed : fallback
  } catch {
    return fallback
  }
}

async function loadStepPairsFromText(path: string, fallback: Array<{ prev: string; current: string }>): Promise<Array<{ prev: string; current: string }>> {
  if (typeof window === "undefined") {
    return fallback
  }
  try {
    const response = await fetch(path, { cache: "no-store" })
    if (!response.ok) return fallback
    const text = await response.text()
    const parsed = parseStepPairs(text)
    return parsed.length > 0 ? parsed : fallback
  } catch {
    return fallback
  }
}

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

export async function fetchCompanyTimeline(companyName: string): Promise<CompanyTimeline | null> {
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

    const data = await request<CompanyTimelineInput>(`/api/companies/${encodeURIComponent(companyName)}/timeline`)
    return normalizeTimeline(data)
  } catch (error) {
    console.error("Failed to fetch company timeline", error)
    return null
  }
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
      message: "?뚯궗 ?깅줉 ?붿껌 媛먯궗?⑸땲?? 泥섎━?먮뒗 ?쇱젙 ?쒓컙???뚯슂?????덉뒿?덈떎.",
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

export type ReportCreateRequest = {
  companyName: string
  recruitmentMode: RecruitmentMode
  rollingResultType?: RollingReportType | null
  prevReportedDate?: string | null
  prevStepName?: string | null
  currentStepName?: string | null
  reportedDate?: string | null
  notificationMessage?: string | null
  todayAnnouncement?: boolean
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

export async function fetchRollingReportCurrentStepNames(companyName?: string, query?: string, mode: RecruitmentMode = "ROLLING"): Promise<string[]> {
  void companyName
  if (USE_MOCK) {
    await delay(120)
  }
  const normalizedQuery = query?.trim().toLowerCase() ?? ""
  const samplePath = mode === "INTERN" ? INTERN_STEP_CURRENT_SAMPLES_TXT_PATH : ROLLING_STEP_CURRENT_SAMPLES_TXT_PATH
  const fallback = mode === "INTERN" ? DEFAULT_INTERN_STEP_CURRENT_SAMPLES : DEFAULT_ROLLING_STEP_CURRENT_SAMPLES
  const samples = await loadSamplesFromText(samplePath, fallback)
  if (!normalizedQuery) return samples
  return samples.filter((name) => name.toLowerCase().includes(normalizedQuery))
}

export async function fetchRollingReportPrevStepNames(companyName?: string, query?: string, mode: RecruitmentMode = "ROLLING"): Promise<string[]> {
  void companyName
  if (USE_MOCK) {
    await delay(120)
  }
  const normalizedQuery = query?.trim().toLowerCase() ?? ""
  const samplePath = mode === "INTERN" ? INTERN_STEP_PREV_SAMPLES_TXT_PATH : ROLLING_STEP_PREV_SAMPLES_TXT_PATH
  const fallback = mode === "INTERN" ? DEFAULT_INTERN_STEP_PREV_SAMPLES : DEFAULT_ROLLING_STEP_PREV_SAMPLES
  const samples = await loadSamplesFromText(samplePath, fallback)
  if (!normalizedQuery) return samples
  return samples.filter((name) => name.toLowerCase().includes(normalizedQuery))
}

export async function resolveRollingStepPair(
  direction: "prev_to_current" | "current_to_prev",
  stepName: string,
  mode: RecruitmentMode = "ROLLING",
): Promise<string | null> {
  const target = stepName.trim()
  if (!target) return null
  const pairPath = mode === "INTERN" ? INTERN_STEP_PAIRS_TXT_PATH : ROLLING_STEP_PAIRS_TXT_PATH
  const fallback = mode === "INTERN" ? DEFAULT_INTERN_STEP_PAIRS : DEFAULT_ROLLING_STEP_PAIRS
  const pairs = await loadStepPairsFromText(pairPath, fallback)
  if (direction === "prev_to_current") {
    const found = pairs.find((pair) => pair.prev === target)
    return found?.current ?? null
  }
  const found = pairs.find((pair) => pair.current === target)
  return found?.prev ?? null
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

export async function fetchAdminReports(status?: ReportStatus): Promise<ReportItem[]> {
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
        onHold: false,
      },
    ]
  }
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  const qs = params.toString()
  const data = await request<ReportItemInput[]>(`/api/admin/reports${qs ? `?${qs}` : ""}`)
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
  rollingResultType?: RollingReportType | null
  prevReportedDate?: string | null
  prevStepName?: string | null
  currentStepName?: string | null
  reportedDate?: string | null
}

export async function updateAdminReport(reportId: number, payload: ReportUpdateRequest): Promise<ReportItem> {
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
      onHold: false,
    }
  }
  const data = await request<ReportItemInput>(`/api/admin/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  return normalizeReportItem(data)
}

export async function processAdminReport(reportId: number): Promise<ReportItem> {
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
      onHold: false,
    }
  }
  const data = await request<ReportItemInput>(`/api/admin/reports/${reportId}/process`, {
    method: "POST",
  })
  return normalizeReportItem(data)
}

export async function assignAdminReport(reportId: number): Promise<ReportItem> {
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
      onHold: false,
    }
  }
  const data = await request<ReportItemInput>(`/api/admin/reports/${reportId}/assign`, {
    method: "POST",
  })
  return normalizeReportItem(data)
}

export async function assignAllPendingAdminReports(): Promise<{ updatedCount: number }> {
  if (USE_MOCK) {
    await delay(250)
    return { updatedCount: 0 }
  }
  const data = await request<ReportAssignBatchResponseInput>(`/api/admin/reports/assign-pending`, {
    method: "POST",
  })
  return { updatedCount: data.updatedCount ?? 0 }
}

export async function discardAdminReport(reportId: number): Promise<ReportItem> {
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
      onHold: false,
    }
  }
  const data = await request<ReportItemInput>(`/api/admin/reports/${reportId}/discard`, {
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
      message: "?붿껌???먭린?덉뒿?덈떎.",
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
      window.location.assign(`${API_BASE_URL}/auth/login/google?force_consent=1&next=${encodeURIComponent(safeNext)}`)
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





