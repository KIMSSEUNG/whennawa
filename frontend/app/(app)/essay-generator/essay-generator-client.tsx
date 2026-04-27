"use client"

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, FileText, Loader2, Sparkles, Upload, X } from "lucide-react"

import { getUser } from "@/lib/api"
import { careerBoardTheme } from "@/lib/career-board-theme"
import { analyzeEssayJobPost, type EssayAnalysisResponse } from "@/lib/essay-api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"

type EssayGeneratorClientProps = {
  initialCompanyName: string
  initialTargetPosition: string
  nextPath: string
}

type ImageFileItem = {
  id: string
  file: File
  previewUrl: string
}

const EXPERIENCE_PROMPT = `아래 경력을 자소서 생성에 적합한 형태로 간결하게 정리하세요.

1. 프로젝트명 - 한 줄 요약
- 역할
- 핵심 기능
- 성과 또는 개선점

규칙:
- 경력에 없는 내용은 추가하지 마세요.
- 각 프로젝트는 하나의 번호 블록으로 유지하세요.
- 문장은 짧고 명확하게 작성하세요.`

function makeImageId(file: File) {
  return `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeImageFiles(files: File[]) {
  return files.filter((file) => file.type.startsWith("image/"))
}

function CopyButton({
  text,
  label = "복사",
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "복사됨" : label}
    </Button>
  )
}

function PromptDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        프롬프트 보기
      </Button>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>경력 정리 프롬프트</DialogTitle>
          <DialogDescription>
            아래 프롬프트를 복사해 다른 AI 도구에 그대로 붙여넣어 사용하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            readOnly
            value={EXPERIENCE_PROMPT}
            className="min-h-[280px] whitespace-pre-wrap border-[#d9e5ff] bg-[#f8fbff] text-sm leading-7 text-[#25396f]"
          />
          <div className="flex items-center justify-end gap-2">
            <CopyButton text={EXPERIENCE_PROMPT} label="프롬프트 복사" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResultCard({
  title,
  text,
  onCopy,
}: {
  title: string
  text: string
  onCopy: () => void
}) {
  return (
    <div className="rounded-2xl border border-[#dce5ff] bg-[#fbfdff] p-4 shadow-[0_10px_28px_rgba(72,101,170,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#27407a]">{title}</p>
          <p className="text-xs text-[#6e7ca8]">복사해서 바로 활용할 수 있는 초안입니다.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          <Copy className="size-4" />
          복사
        </Button>
      </div>
      <ScrollArea className="h-[260px] rounded-xl border border-[#e4ebff] bg-white px-4 py-3">
        <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#22345f]">
          {text || "생성된 결과가 여기에 표시됩니다."}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function EssayGeneratorClient({
  initialCompanyName,
  initialTargetPosition,
  nextPath,
}: EssayGeneratorClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)
  const previewItemsRef = useRef<ImageFileItem[]>([])

  const [companyName, setCompanyName] = useState(initialCompanyName)
  const [targetPosition, setTargetPosition] = useState(initialTargetPosition)
  const [companyUrl, setCompanyUrl] = useState("")
  const [experienceText, setExperienceText] = useState("")
  const [essayPrompt, setEssayPrompt] = useState("")
  const [imageItems, setImageItems] = useState<ImageFileItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<EssayAnalysisResponse | null>(null)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  useEffect(() => {
    previewItemsRef.current = imageItems
  }, [imageItems])

  useEffect(() => {
    return () => {
      previewItemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [])

  const addFiles = (incoming: File[]) => {
    const nextFiles = normalizeImageFiles(incoming)
    if (!nextFiles.length) return

    setImageItems((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: makeImageId(file),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ])
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    addFiles(Array.from(event.dataTransfer.files ?? []))
  }

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const clipboardFiles = Array.from(event.clipboardData.files ?? [])
    if (clipboardFiles.some((file) => file.type.startsWith("image/"))) {
      event.preventDefault()
      addFiles(clipboardFiles)
    }
  }

  const removeImageItem = (id: string) => {
    setImageItems((current) => {
      const target = current.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((item) => item.id !== id)
    })
  }

  const clearImages = () => {
    imageItems.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    setImageItems([])
  }

  const copyText = async (section: "emotion" | "formal", text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(section)
      window.setTimeout(() => setCopiedSection((current) => (current === section ? null : current)), 1400)
    } catch {
      setCopiedSection(null)
    }
  }

  const handleGenerate = async () => {
    setErrorMessage(null)
    setResult(null)

    if (!companyName.trim() || !targetPosition.trim() || !experienceText.trim() || !essayPrompt.trim()) {
      setErrorMessage("회사명, 지원 직무, 경력 내용, 자소서 문항을 모두 입력해 주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      const user = await getUser()
      if (!user) {
        router.push(`/login?reason=session_expired&next=${encodeURIComponent(nextPath)}`)
        return
      }

      const response = await analyzeEssayJobPost({
        companyName: companyName.trim(),
        targetPosition: targetPosition.trim(),
        companyUrl: companyUrl.trim(),
        experienceText: experienceText.trim(),
        essayPrompt: essayPrompt.trim(),
        files: imageItems.map((item) => item.file),
      })

      setResult(response)
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "자소서 생성에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const heroChips = ["OCR", "RAG", "감성형 / 정돈형"]

  const hasResult = Boolean(result)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(239,244,255,0.95),rgba(244,247,255,0.88)_36%,rgba(249,251,255,1)_74%)] text-[#22345f]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
        <section className={careerBoardTheme.heroSection}>
          <div className={careerBoardTheme.heroTopLine} />
          <div className={careerBoardTheme.heroGlowRight} />
          <div className={careerBoardTheme.heroGlowLeft} />

          <div className="relative z-10">
            <p className={careerBoardTheme.heroEyebrow}>자소서 생성기</p>
            <h1 className={`${careerBoardTheme.heroTitle} whitespace-nowrap`}>
              공고와 경력을 반영해 자소서를 생성합니다
            </h1>
            <p className={careerBoardTheme.heroDescription}>
              회사 정보, 채용공고, 경력을 함께 반영해 감성형과 정돈형 두 버전의 자소서를 만듭니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {heroChips.map((chip) => (
                <span key={chip} className={careerBoardTheme.tag}>
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card className={`${careerBoardTheme.card} overflow-hidden py-0 shadow-[0_18px_40px_rgba(71,96,171,0.08)]`}>
            <CardHeader className="border-b border-[#edf2ff] px-5 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-[22px] font-extrabold tracking-tight text-[#20356b]">
                    1. 입력 정보
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-[#6c7aa3]">
                    회사와 경력을 함께 넣으면 초안 품질이 더 안정적입니다.
                  </CardDescription>
                </div>
                <PromptDialog />
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#22345f]">회사명</label>
                  <Input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="예: 네이버"
                    className={careerBoardTheme.field}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#22345f]">지원 직무</label>
                  <Input
                    value={targetPosition}
                    onChange={(event) => setTargetPosition(event.target.value)}
                    placeholder="예: 프론트엔드 개발"
                    className={careerBoardTheme.field}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#22345f]">회사 URL</label>
                <Input
                  value={companyUrl}
                  onChange={(event) => setCompanyUrl(event.target.value)}
                  placeholder="https://..."
                  className={careerBoardTheme.field}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-[#22345f]">경험 내용</label>
                </div>
                <Textarea
                  value={experienceText}
                  onChange={(event) => setExperienceText(event.target.value)}
                  onPaste={handlePaste}
                  placeholder="경력 내용을 번호 블록 형태로 입력해 주세요."
                  className="h-[190px] resize-none overflow-y-auto border-[#d9e5ff] bg-white px-4 py-3 text-[15px] leading-7 text-[#22345f] placeholder:text-[#95a2c4] focus-visible:border-[#8ea9ff] focus-visible:ring-[#8ea9ff]/30"
                />
              </div>

              <div className="rounded-2xl border border-dashed border-[#c9d7ff] bg-[linear-gradient(180deg,#fbfdff_0%,#f6f9ff_100%)] p-4">
                <div
                  className="flex cursor-pointer flex-col gap-4 rounded-2xl border border-[#e2eaff] bg-white px-4 py-5 text-center shadow-sm transition hover:border-[#b8cbff]"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(event) => event.preventDefault()}
                  onPaste={handlePaste}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                >
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#edf3ff] text-[#3356c9]">
                    <Upload className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-[#20356b]">공고 이미지 또는 스크린샷 업로드</p>
                    <p className="text-sm text-[#6c7aa3]">
                      PNG, JPG, JPEG, WEBP / 최대 10MB / 여러 장 업로드 가능
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button type="button" size="sm" className={careerBoardTheme.solidButton}>
                      파일 선택
                    </Button>
                  </div>
                  <p className="rounded-2xl bg-[#f7faff] px-4 py-3 text-sm text-[#6d789e]">
                    이미지를 붙여넣거나 선택해 자소서 생성에 사용할 수 있습니다.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#22345f]">
                      선택한 이미지 {imageItems.length}장
                    </p>
                    {imageItems.length > 0 ? (
                      <Button type="button" variant="outline" size="sm" onClick={clearImages}>
                        모두 지우기
                      </Button>
                    ) : null}
                  </div>

                  {imageItems.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {imageItems.map((item) => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-2xl border border-[#e4ebff] bg-white shadow-sm"
                        >
                          <div className="relative aspect-[4/3] bg-[#f6f9ff]">
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImageItem(item.id)}
                              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#3657b7] shadow-sm transition hover:bg-white"
                              aria-label="이미지 삭제"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <p className="truncate text-xs font-medium text-[#5f6d97]">{item.file.name}</p>
                            <span className="text-[11px] text-[#8b96b5]">
                              {(item.file.size / 1024 / 1024).toFixed(1)}MB
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#e4ebff] bg-white px-4 py-8 text-center text-sm text-[#7f8bab]">
                      선택한 이미지가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-[#22345f]">자소서 문항</label>
                  <span className="text-xs text-[#7b86a8]">회사와 직무에 맞는 문항만 넣어 주세요.</span>
                </div>
                <Textarea
                  value={essayPrompt}
                  onChange={(event) => setEssayPrompt(event.target.value)}
                  placeholder="예: 지원동기, 직무 역량, 입사 후 포부"
                  className="h-[120px] resize-none overflow-y-auto border-[#d9e5ff] bg-white px-4 py-3 text-[15px] leading-7 text-[#22345f] placeholder:text-[#95a2c4] focus-visible:border-[#8ea9ff] focus-visible:ring-[#8ea9ff]/30"
                />
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-[#ffd4d4] bg-[#fff7f7] px-4 py-3 text-sm text-[#b13a3a]">
                  {errorMessage}
                </div>
              ) : null}

              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isSubmitting}
                className="h-12 w-full rounded-full bg-[#3560f0] text-base font-semibold text-white shadow-[0_16px_30px_rgba(53,96,240,0.24)] transition hover:bg-[#2c52d9]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    생성 중
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    자소서 초안 생성
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div ref={resultRef}>
            <Card className={`${careerBoardTheme.card} overflow-hidden py-0 shadow-[0_18px_40px_rgba(71,96,171,0.08)]`}>
              <CardHeader className="border-b border-[#edf2ff] px-5 py-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-[22px] font-extrabold tracking-tight text-[#20356b]">
                      2. 생성 결과
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-[#6c7aa3]">
                      생성된 초안은 감성형과 정돈형 두 버전으로 제공됩니다.
                    </CardDescription>
                  </div>
                  {result ? (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={careerBoardTheme.tag}>{result.companyName}</span>
                      <span className={careerBoardTheme.tag}>{result.position}</span>
                      <span className={careerBoardTheme.tag}>
                        신뢰도{" "}
                        {result.confidence === "high"
                          ? "높음"
                          : result.confidence === "medium"
                            ? "보통"
                            : "낮음"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-5 py-5">
                {hasResult ? (
                  <>
                    <ResultCard
                      title="감성형"
                      text={result?.essayEmotionText ?? ""}
                      onCopy={() => {
                        if (result?.essayEmotionText) copyText("emotion", result.essayEmotionText)
                      }}
                    />
                    <ResultCard
                      title="정돈형"
                      text={result?.essayFormalText ?? ""}
                      onCopy={() => {
                        if (result?.essayFormalText) copyText("formal", result.essayFormalText)
                      }}
                    />

                    {result?.missingFields?.length ? (
                      <div className="rounded-2xl border border-[#eef1ff] bg-[#fbfcff] px-4 py-3 text-sm text-[#66749d]">
                        확인 필요 항목: {result.missingFields.join(", ")}
                      </div>
                    ) : null}

                    {copiedSection ? (
                      <div className="rounded-2xl border border-[#d7e5ff] bg-[#f6f9ff] px-4 py-3 text-sm text-[#3657b7]">
                        {copiedSection === "emotion"
                          ? "감성형 초안을 복사했습니다."
                          : "정돈형 초안을 복사했습니다."}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce6ff] bg-[#fbfdff] px-6 py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3ff] text-[#3557c8]">
                      <FileText className="size-6" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-[#22345f]">
                      생성 결과가 이곳에 표시됩니다.
                    </p>
                    <p className="mt-2 max-w-[320px] text-sm leading-6 text-[#7a86a6]">
                      회사명, 지원 직무, 경력 내용, 자소서 문항을 입력한 뒤 자소서 초안을 생성해 주세요.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-[#6a78a0]">
                      <span className={careerBoardTheme.tag}>OCR</span>
                      <span className={careerBoardTheme.tag}>RAG</span>
                      <span className={careerBoardTheme.tag}>감성형 / 정돈형</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
