export type EssayAnalysisResponse = {
  companyName: string
  position: string
  info: string[]
  companyProfile: Record<string, unknown>
  embeddingSourceText: string
  ragContextText: string
  essayEmotionText: string
  essayFormalText: string
  essayRawText: string
  essayPromptUsed: string
  llmProvider: string
  llmModel: string
  rawText: string
  confidence: "high" | "medium" | "low"
  missingFields: string[]
  recentAnalyses: EssayRecentAnalysisItem[]
}

export type EssayRecentAnalysisItem = {
  id: number
  companyName: string
  targetPosition: string
  essayEmotionText: string
  essayFormalText: string
  createdAt: string
}

export type EssayAnalysisRequest = {
  companyName: string
  targetPosition: string
  companyUrl: string
  experienceText: string
  essayPrompt: string
  files: File[]
  userId: string
}

export async function fetchEssayRecentAnalyses(
  userId: string,
  limit = 3,
): Promise<EssayRecentAnalysisItem[]> {
  const params = new URLSearchParams({
    userId,
    limit: String(limit),
  })

  const response = await fetch(`${ESSAY_API_BASE_URL}/api/job-post/recent?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as EssayRecentAnalysisItem[]
}

const ESSAY_API_BASE_URL = (process.env.NEXT_PUBLIC_ESSAY_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "")

async function readErrorMessage(response: Response) {
  const raw = await response.text()
  if (!raw) return fallbackEssayErrorMessage(response.status)

  try {
    const parsed = JSON.parse(raw) as { detail?: string; message?: string }
    const message = parsed.detail ?? parsed.message
    if (message?.trim()) return normalizeEssayErrorMessage(message.trim(), response.status)
  } catch {
    // fall back to raw response text
  }

  return normalizeEssayErrorMessage(raw.trim(), response.status)
}

function fallbackEssayErrorMessage(status: number) {
  if (status === 400) return "입력 내용을 다시 확인해 주세요."
  if (status === 401 || status === 403) return "로그인이 필요합니다."
  if (status === 404) return "요청한 정보를 찾을 수 없습니다."
  if (status === 422) return "입력한 공고 정보를 다시 확인해 주세요."
  if (status >= 500) return "서버 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
  return "요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요."
}

function normalizeEssayErrorMessage(message: string, status: number) {
  const lowered = message.toLowerCase()

  if (
    lowered.includes("companyname은 필수") ||
    lowered.includes("회사명을 입력") ||
    lowered.includes("companyname")
  ) {
    return "회사명을 입력해 주세요."
  }
  if (
    lowered.includes("targetposition은 필수") ||
    lowered.includes("지원 직무를 입력") ||
    lowered.includes("targetposition")
  ) {
    return "지원 직무를 입력해 주세요."
  }
  if (lowered.includes("companyurl은 필수") || lowered.includes("공고 url을 입력")) {
    return "공고 URL을 입력해 주세요."
  }
  if (lowered.includes("companyurl 형식") || lowered.includes("url 형식")) {
    return "공고 URL 형식이 올바르지 않습니다. https:// 로 시작하는 주소를 입력해 주세요."
  }
  if (lowered.includes("experiencetext는 필수") || lowered.includes("경험 내용을 입력")) {
    return "경험 내용을 입력해 주세요."
  }
  if (lowered.includes("essayprompt는 300자")) {
    return "자소서 문항은 300자 이하여야 합니다."
  }
  if (lowered.includes("채용공고 이미지가 필요") || lowered.includes("공고 이미지를 첨부")) {
    return "공고 이미지를 첨부해 주세요."
  }
  if (lowered.includes("공고 페이지를 불러오지 못했습니다")) {
    return message
  }
  if (lowered.includes("이미지 인식 기능을 사용할 수 없습니다")) {
    return message
  }
  if (lowered.includes("이미지에서 텍스트를 읽지 못했습니다")) {
    return message
  }
  if (status >= 500) {
    return "서버 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
  }
  return message
}

export async function analyzeEssayJobPost(input: EssayAnalysisRequest): Promise<EssayAnalysisResponse> {
  const formData = new FormData()
  formData.append("companyName", input.companyName)
  formData.append("targetPosition", input.targetPosition)
  formData.append("companyUrl", input.companyUrl)
  formData.append("experienceText", input.experienceText)
  formData.append("essayPrompt", input.essayPrompt)
  formData.append("userId", input.userId)
  input.files.forEach((file) => {
    formData.append("files", file, file.name)
  })

  const response = await fetch(`${ESSAY_API_BASE_URL}/api/job-post/analyze`, {
    method: "POST",
    credentials: "include",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return (await response.json()) as EssayAnalysisResponse
}
