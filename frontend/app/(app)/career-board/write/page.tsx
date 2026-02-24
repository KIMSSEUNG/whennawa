"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBoardPost } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CAREER_BOARD_COMPANY_NAME, CAREER_BOARD_PATH } from "@/lib/career-board"

export default function CareerBoardWritePage() {
  const router = useRouter()
  const companyName = CAREER_BOARD_COMPANY_NAME
  const boardHref = CAREER_BOARD_PATH

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return

    setIsSubmitting(true)
    setMessage(null)
    try {
      await createBoardPost(companyName, title, content)
      router.push(boardHref)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "게시글 등록에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-[980px] space-y-6 px-4 py-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_55%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Write Post</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">취업 고민 글쓰기</h1>
          <p className="mt-1 text-sm text-muted-foreground">취업 준비 중인 고민, 경험, 질문을 자유롭게 공유해 주세요.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={boardHref}>
              <Button type="button" variant="outline" className="h-10">목록으로 돌아가기</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <form className="rounded-2xl border border-border/60 bg-card p-4 md:p-5" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="제목을 입력해 주세요."
              maxLength={120}
              required
              className="h-11"
            />
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="내용을 입력해 주세요."
              className="min-h-[260px]"
              maxLength={3000}
              required
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "등록 중..." : "게시글 등록"}
              </Button>
              <Link href={boardHref}>
                <Button type="button" variant="outline">취소</Button>
              </Link>
            </div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </form>

        <aside className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-sm font-semibold text-foreground">작성 팁</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
            <li>지원 단계, 일정, 고민 포인트를 구체적으로 적어 주세요.</li>
            <li>개인정보나 민감정보는 포함하지 마세요.</li>
            <li>상호 존중하는 표현으로 작성해 주세요.</li>
          </ul>
        </aside>
      </section>
    </div>
  )
}
