import { mockCompanies, mockUser } from "./mock-data"
import type {
  ChatMessage,
  BoardPost,
  CompanyCreateResult,
  CompanySearchItem,
  CompanyTimeline,
  KeywordLeadTime,
  RollingPrediction,
  ReportItem,
  ReportStatus,
  ReportStep,
  RecruitmentMode,
  RollingReportType,
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
  companyId: number
  companyName: string
  originalCompanyName: string
  created: boolean
  normalizedChanged: boolean
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
  currentStepName: string | null
  reportedDate: Date | string | null
  status: ReportStatus
  onHold: boolean
}

type ReportAssignBatchResponseInput = {
  updatedCount: number
}

type ChatMessageInput = {
  companyId: number
  senderNickname: string
  message: string
  timestamp: Date | string
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
const ROLLING_STEP_SAMPLES_TXT_PATH = "/data/rolling-step-samples.txt"
const DEFAULT_ROLLING_STEP_SAMPLES = ["서류 합격", "코딩 테스트", "1차 면접", "2차 면접", "최종 합격"]

type UserInfoResponse = {
  userId: number
  email: string
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

const normalizeBoardPost = (item: BoardPostInput): BoardPost => ({
  ...item,
  createdAt: toDate(item.createdAt),
})

const normalizeRollingPrediction = (item: RollingPredictionInput): RollingPrediction => ({
  ...item,
  previousStepDate: toDate(item.previousStepDate),
  expectedDate: toDateOrNull(item.expectedDate),
  expectedStartDate: toDateOrNull(item.expectedStartDate),
  expectedEndDate: toDateOrNull(item.expectedEndDate),
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

async function loadRollingStepSamplesFromText(): Promise<string[]> {
  if (typeof window === "undefined") {
    return DEFAULT_ROLLING_STEP_SAMPLES
  }
  try {
    const response = await fetch(ROLLING_STEP_SAMPLES_TXT_PATH, { cache: "no-store" })
    if (!response.ok) return DEFAULT_ROLLING_STEP_SAMPLES
    const text = await response.text()
    const parsed = parseStepSamples(text)
    return parsed.length > 0 ? parsed : DEFAULT_ROLLING_STEP_SAMPLES
  } catch {
    return DEFAULT_ROLLING_STEP_SAMPLES
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
      const isMeEndpoint = path.startsWith("/auth/api/me")
      if (!isMeEndpoint && window.location.pathname !== "/login") {
        const hadSession = window.localStorage.getItem("had_session") === "1"
        const reason = hadSession ? "session_expired" : "auth_required"
        const next = `${window.location.pathname}${window.location.search}`
        window.location.assign(`/login?reason=${reason}&next=${encodeURIComponent(next)}`)
      }
    }
    const message = await response.text()
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

    const data = await request<UserInfoResponse>("/auth/api/me")
    if (!data?.userId || !data.email) {
      return null
    }
    const fallbackName = data.email?.split("@")[0] ?? "User"
    return { id: String(data.userId), email: data.email, name: fallbackName, role: data.role }
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
                label: "지원서 접수",
                occurredAt: new Date(),
                diffDays: null,
              },
            ],
          },
        ],
        rollingSteps: [
          {
            stepName: "1차 면접",
            sampleCount: 5,
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

export async function fetchCompanyLeadTime(companyName: string, keyword: string): Promise<KeywordLeadTime | null> {
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
      `/api/companies/${encodeURIComponent(companyName)}/lead-time?q=${encodeURIComponent(keyword)}`,
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
      companyId: Math.floor(Math.random() * 100000),
      companyName,
      originalCompanyName: companyName,
      created: true,
      normalizedChanged: false,
    }
  }
  const data = await request<CompanyCreateResultInput>("/api/companies", {
    method: "POST",
    body: JSON.stringify({ companyName }),
  })
  return normalizeCompanyCreateResult(data)
}

export async function fetchBoardPosts(companyName: string, limit = 50): Promise<BoardPost[]> {
  if (!companyName.trim()) return []
  if (USE_MOCK) {
    await delay(150)
    return []
  }
  const params = new URLSearchParams({ limit: String(limit) })
  const data = await request<BoardPostInput[]>(`/api/boards/${encodeURIComponent(companyName)}/posts?${params.toString()}`)
  return (data ?? []).map(normalizeBoardPost)
}

export async function createBoardPost(companyName: string, title: string, content: string): Promise<BoardPost> {
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
    body: JSON.stringify({ title, content }),
  })
  return normalizeBoardPost(data)
}

export async function searchBoardPosts(
  companyName: string,
  query: string,
  field: "title" | "content",
  limit = 50,
): Promise<BoardPost[]> {
  if (!companyName.trim() || !query.trim()) return []
  if (USE_MOCK) {
    await delay(150)
    return []
  }
  const params = new URLSearchParams({ q: query, field, limit: String(limit) })
  const data = await request<BoardPostInput[]>(
    `/api/boards/${encodeURIComponent(companyName)}/posts/search?${params.toString()}`,
  )
  return (data ?? []).map(normalizeBoardPost)
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

export type ReportCreateRequest = {
  companyName: string
  recruitmentMode: RecruitmentMode
  rollingResultType?: RollingReportType | null
  prevReportedDate?: string | null
  currentStepName?: string | null
  reportedDate?: string | null
}

export async function fetchReportSteps(
  companyName: string,
): Promise<ReportStep[]> {
  if (!companyName.trim()) return []
  if (USE_MOCK) {
    await delay(200)
    return [
      { stepId: 1, stepName: "서류 발표" },
      { stepId: 2, stepName: "코딩 테스트" },
      { stepId: 3, stepName: "1차 면접" },
    ]
  }
  const params = new URLSearchParams({ companyName })
  const data = await request<ReportStepInput[]>(`/api/reports/steps?${params.toString()}`)
  return data
}

export async function fetchRollingReportStepNames(companyName?: string, query?: string): Promise<string[]> {
  void companyName
  if (USE_MOCK) {
    await delay(120)
  }
  const normalizedQuery = query?.trim().toLowerCase() ?? ""
  const samples = await loadRollingStepSamplesFromText()
  if (!normalizedQuery) return samples
  return samples.filter((name) => name.toLowerCase().includes(normalizedQuery))
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
        currentStepName: "1차 면접",
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
      { stepId: 2, stepName: "코딩 테스트" },
      { stepId: 3, stepName: "1차 면접" },
    ]
  }
  return await request<ReportStepInput[]>(`/api/admin/reports/${reportId}/steps`)
}

export type ReportUpdateRequest = {
  companyName: string
  recruitmentMode: RecruitmentMode
  rollingResultType?: RollingReportType | null
  prevReportedDate?: string | null
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

    await request<void>("/auth/api/logout", { method: "POST" })
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

    await request<void>("/auth/api/withdraw", { method: "DELETE" })
  } catch (error) {
    console.error("Failed to withdraw", error)
    throw error
  }
}


