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
}

export type EssayAnalysisRequest = {
  companyName: string
  targetPosition: string
  companyUrl: string
  experienceText: string
  essayPrompt: string
  files: File[]
}

const ESSAY_API_BASE_URL = (process.env.NEXT_PUBLIC_ESSAY_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "")

async function readErrorMessage(response: Response) {
  const raw = await response.text()
  if (!raw) return `Request failed with ${response.status}`

  try {
    const parsed = JSON.parse(raw) as { detail?: string; message?: string }
    const message = parsed.detail ?? parsed.message
    if (message?.trim()) return message.trim()
  } catch {
    // fall back to raw response text
  }

  return raw
}

export async function analyzeEssayJobPost(input: EssayAnalysisRequest): Promise<EssayAnalysisResponse> {
  const formData = new FormData()
  formData.append("companyName", input.companyName)
  formData.append("targetPosition", input.targetPosition)
  formData.append("companyUrl", input.companyUrl)
  formData.append("experienceText", input.experienceText)
  formData.append("essayPrompt", input.essayPrompt)
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