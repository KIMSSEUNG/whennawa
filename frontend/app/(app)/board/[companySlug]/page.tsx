"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { deleteBoardPost, fetchBoardPosts, getUser, searchBoardPosts, updateBoardPost } from "@/lib/api"
import { fromCompanySlug } from "@/lib/company-slug"
import type { BoardPost } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/empty-state"

type SearchField = "title" | "content"

const POST_PAGE_SIZE = 10

function formatDate(value: Date) {
  return value.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function CompanyBoardPage() {
  const params = useParams<{ companySlug: string }>()
  const router = useRouter()
  const companySlug = params?.companySlug ?? ""
  const companyName = useMemo(() => fromCompanySlug(companySlug), [companySlug])
  const boardHref = `/board/${companySlug}`
  const writeHref = `${boardHref}/write`

  const [posts, setPosts] = useState<BoardPost[]>([])
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [searchField, setSearchField] = useState<SearchField>("title")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)

  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPosts = async (reset: boolean) => {
    const targetPage = reset ? 0 : page + 1
    if (reset) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const data = await fetchBoardPosts(companyName, targetPage, POST_PAGE_SIZE)
      setPosts((prev) => (reset ? data.items : [...prev, ...data.items]))
      setPage(data.page)
      setHasNext(data.hasNext)
      if (reset) setIsSearchMode(false)
    } catch (error) {
      const text = error instanceof Error ? error.message : "게시판 목록을 불러오지 못했습니다."
      setMessage(text)
      if (reset) setPosts([])
    } finally {
      if (reset) setIsLoading(false)
      else setIsLoadingMore(false)
    }
  }

  const runSearch = async (reset: boolean) => {
    const normalizedQuery = searchQuery.trim()
    if (!normalizedQuery) {
      await loadPosts(true)
      return
    }

    const targetPage = reset ? 0 : page + 1
    if (reset) setIsSearching(true)
    else setIsLoadingMore(true)

    try {
      const data = await searchBoardPosts(companyName, normalizedQuery, searchField, targetPage, POST_PAGE_SIZE)
      setPosts((prev) => (reset ? data.items : [...prev, ...data.items]))
      setPage(data.page)
      setHasNext(data.hasNext)
      setIsSearchMode(true)
    } catch (error) {
      const text = error instanceof Error ? error.message : "게시글 검색에 실패했습니다."
      if (text.includes("cooldown") || text.includes("429") || text.includes("3 seconds")) {
        setMessage("검색은 3초에 한 번만 가능합니다. 잠시 후 다시 시도해 주세요.")
      } else {
        setMessage(text)
      }
    } finally {
      if (reset) setIsSearching(false)
      else setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!companyName) return
    setMessage(null)
    void loadPosts(true)
    void (async () => {
      const me = await getUser().catch(() => null)
      const parsed = me?.id ? Number(me.id) : NaN
      setMyUserId(Number.isFinite(parsed) ? parsed : null)
      setIsAdmin(me?.role === "ADMIN")
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName])

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    await runSearch(true)
  }

  const handleLoadMore = async () => {
    if (!hasNext || isLoadingMore || isLoading || isSearching) return
    if (isSearchMode) {
      await runSearch(false)
    } else {
      await loadPosts(false)
    }
  }

  const startEdit = (post: BoardPost) => {
    setEditingPostId(post.postId)
    setEditTitle(post.title)
    setEditContent(post.content)
  }

  const cancelEdit = () => {
    setEditingPostId(null)
    setEditTitle("")
    setEditContent("")
  }

  const reloadCurrent = async () => {
    if (isSearchMode && searchQuery.trim()) {
      await runSearch(true)
    } else {
      await loadPosts(true)
    }
  }

  const handleUpdate = async (postId: number) => {
    if (!editTitle.trim() || !editContent.trim()) return

    setIsEditing(true)
    setMessage(null)
    try {
      await updateBoardPost(companyName, postId, editTitle, editContent)
      setMessage("게시글이 수정되었습니다.")
      cancelEdit()
      await reloadCurrent()
    } catch (error) {
      const text = error instanceof Error ? error.message : "게시글 수정에 실패했습니다."
      setMessage(text)
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async (postId: number) => {
    if (isDeleting) return

    setIsDeleting(true)
    setMessage(null)
    try {
      await deleteBoardPost(companyName, postId)
      setMessage("게시글이 삭제되었습니다.")
      await reloadCurrent()
    } catch (error) {
      const text = error instanceof Error ? error.message : "게시글 삭제에 실패했습니다."
      setMessage(text)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="page-shell [--page-max:1200px] space-y-6 py-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_55%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Board Home</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">{companyName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">목록에서는 제목만 노출되며, 본문은 상세 페이지에서 확인합니다.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={writeHref}>
              <Button type="button" className="h-10">게시글 작성하기</Button>
            </Link>
            <Link href={`/search?company=${encodeURIComponent(companyName)}`}>
              <Button type="button" variant="outline" className="h-10">회사 상세 검색</Button>
            </Link>
            <Link href="/board">
              <Button type="button" variant="ghost" className="h-10">다른 회사 찾기</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">게시글 탐색</h2>
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
            {isSearchMode ? "검색 결과" : "전체 목록"}
          </span>
        </div>

        <form className="flex flex-wrap gap-2" onSubmit={handleSearch}>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="title">제목</option>
            <option value="content">내용</option>
          </select>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색어를 입력해 주세요"
            className="h-10 w-full min-w-0 flex-1"
          />
          <Button type="submit" className="h-10" disabled={isSearching}>
            {isSearching ? "검색 중..." : "검색"}
          </Button>
          <Button type="button" variant="outline" className="h-10" onClick={() => void loadPosts(true)}>
            전체 보기
          </Button>
        </form>
      </section>

      {message && (
        <div className="rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground">{message}</div>
      )}

      <section className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">불러오는 중...</div>
        ) : posts.length === 0 ? (
          <EmptyState title="게시글이 없습니다" description="검색 조건을 바꾸거나 새 게시글을 작성해 보세요." />
        ) : (
          <>
            {posts.map((post) => {
              const canEdit = isAdmin || (myUserId != null && post.authorUserId != null && myUserId === post.authorUserId)
              const isEditingPost = editingPostId === post.postId

              return (
                <article
                  key={post.postId}
                  onClick={() => {
                    if (!isEditingPost) {
                      router.push(`${boardHref}/posts/${post.postId}`)
                    }
                  }}
                  className="cursor-pointer rounded-2xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  {isEditingPost ? (
                    <div className="space-y-3">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} />
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[140px]"
                        maxLength={3000}
                      />
                      <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button type="button" onClick={() => void handleUpdate(post.postId)} disabled={isEditing}>
                          {isEditing ? "수정 중..." : "수정 저장"}
                        </Button>
                        <Button type="button" variant="outline" onClick={cancelEdit}>취소</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
                        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          #{post.postId}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5">{post.authorName}</span>
                        <span>•</span>
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                        <Link href={`${boardHref}/posts/${post.postId}`} onClick={(event) => event.stopPropagation()}>
                          <Button type="button" variant="outline">자세히 보기</Button>
                        </Link>
                        {canEdit && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation()
                                startEdit(post)
                              }}
                            >
                              수정
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDelete(post.postId)
                              }}
                              disabled={isDeleting}
                            >
                              {isDeleting ? "삭제 중..." : "삭제"}
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </article>
              )
            })}

            {hasNext && (
              <div className="flex justify-center pt-2">
                <Button type="button" variant="outline" onClick={() => void handleLoadMore()} disabled={isLoadingMore}>
                  {isLoadingMore ? "불러오는 중..." : "더보기"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
