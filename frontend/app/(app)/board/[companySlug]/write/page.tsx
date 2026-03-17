"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createBoardPost } from "@/lib/api"
import { fromCompanySlug } from "@/lib/company-slug"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { boardTheme } from "@/lib/board-theme"

export default function BoardWritePage() {
  const params = useParams<{ companySlug: string }>()
  const router = useRouter()
  const companySlug = params?.companySlug ?? ""
  const companyName = useMemo(() => fromCompanySlug(companySlug), [companySlug])
  const boardHref = `/board/${companySlug}`

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return

    setIsSubmitting(true)
    setMessage(null)
    try {
      await createBoardPost(companyName, title, content, { anonymous: isAnonymous })
      router.push(boardHref)
    } catch (error) {
      const text = error instanceof Error ? error.message : "게시글 등록에 실패했습니다."
      setMessage(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-shell [--page-max:1280px] space-y-6 py-6">
      <section className={boardTheme.heroSection}>
        <div className={boardTheme.heroTopLine} />
        <div className="relative">
          <p className={boardTheme.heroEyebrow}>Write Post</p>
          <h1 className={boardTheme.heroTitle}>{companyName}</h1>
          <p className={boardTheme.heroDescription}>명확한 제목과 구체적인 내용을 작성하면 다른 사용자에게 더 도움이 됩니다.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={boardHref}>
              <Button type="button" variant="outline" className={boardTheme.outlineButton}>목록으로 돌아가기</Button>
            </Link>
            <Link href="/board">
              <Button type="button" variant="ghost" className={boardTheme.ghostButton}>다른 회사 찾기</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <form className={`${boardTheme.card} p-4 md:p-5`} onSubmit={handleSubmit}>
          <div className="space-y-3">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목을 입력해 주세요." maxLength={120} required className={`h-11 ${boardTheme.field}`} />
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="내용을 입력해 주세요." className={`min-h-[260px] ${boardTheme.field}`} maxLength={3000} required />
            <label className={`inline-flex items-center gap-2 text-sm ${boardTheme.metaText}`}>
              <Checkbox checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(checked === true)} />
              <span>익명으로 작성</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={isSubmitting} className={boardTheme.solidButton}>
                {isSubmitting ? "등록 중..." : "게시글 등록"}
              </Button>
              <Link href={boardHref}>
                <Button type="button" variant="outline" className={boardTheme.outlineButton}>취소</Button>
              </Link>
            </div>
            {message && <p className={`text-sm ${boardTheme.metaText}`}>{message}</p>}
          </div>
        </form>

        <aside className={`${boardTheme.card} p-4`}>
          <p className={`text-sm font-semibold ${boardTheme.titleText}`}>작성 팁</p>
          <ul className={`mt-3 space-y-2 text-xs leading-5 ${boardTheme.metaText}`}>
            <li>전형 단계, 일정, 결과를 구체적으로 적어 주세요.</li>
            <li>개인정보와 민감한 정보는 포함하지 말아 주세요.</li>
            <li>비방보다는 사실 위주로 공유해 주세요.</li>
          </ul>
        </aside>
      </section>
    </div>
  )
}
