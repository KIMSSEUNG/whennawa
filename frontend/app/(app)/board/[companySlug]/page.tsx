"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { blockUser, deleteBoardPost, fetchBoardPosts, getUser, searchBoardPosts, updateBoardPost } from "@/lib/api"
import { fromCompanySlug } from "@/lib/company-slug"
import type { BoardPost } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/empty-state"
import { boardTheme } from "@/lib/board-theme"

type SearchField = "title" | "content"

const POST_PAGE_SIZE = 10
const PAGE_GROUP_SIZE = 10

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
  const [totalPages, setTotalPages] = useState(0)
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

  const loadPosts = async (targetPage: number) => {
    const isFirstPage = targetPage === 0
    if (isFirstPage) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const data = await fetchBoardPosts(companyName, targetPage, POST_PAGE_SIZE)
      setPosts(data.items)
      setPage(data.page)
      const resolvedTotalPages =
        typeof data.totalPages === "number" && data.totalPages >= 0
          ? data.totalPages
          : data.hasNext
            ? data.page + 2
            : data.page + 1
      setTotalPages(Math.max(resolvedTotalPages, 0))
      if (isFirstPage) setIsSearchMode(false)
    } catch (error) {
      const text = error instanceof Error ? error.message : "게시글 목록을 불러오지 못했습니다."
      setMessage(text)
      if (isFirstPage) setPosts([])
    } finally {
      if (isFirstPage) setIsLoading(false)
      else setIsLoadingMore(false)
    }
  }

  const runSearch = async (targetPage: number) => {
    const normalizedQuery = searchQuery.trim()
    if (!normalizedQuery) {
      await loadPosts(0)
      return
    }

    const isFirstPage = targetPage === 0
    if (isFirstPage) setIsSearching(true)
    else setIsLoadingMore(true)

    try {
      const data = await searchBoardPosts(companyName, normalizedQuery, searchField, targetPage, POST_PAGE_SIZE)
      setPosts(data.items)
      setPage(data.page)
      const resolvedTotalPages =
        typeof data.totalPages === "number" && data.totalPages >= 0
          ? data.totalPages
          : data.hasNext
            ? data.page + 2
            : data.page + 1
      setTotalPages(Math.max(resolvedTotalPages, 0))
      setIsSearchMode(true)
    } catch (error) {
      const text = error instanceof Error ? error.message : "게시글 검색에 실패했습니다."
      if (text.includes("cooldown") || text.includes("429") || text.includes("3 seconds")) {
        setMessage("검색은 3초에 한 번만 가능합니다. 잠시 후 다시 시도해 주세요.")
      } else {
        setMessage(text)
      }
    } finally {
      if (isFirstPage) setIsSearching(false)
      else setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!companyName) return
    setMessage(null)
    setTotalPages(0)
    void loadPosts(0)
    void (async () => {
      const me = await getUser().catch(() => null)
      const parsed = me?.id ? Number(me.id) : NaN
      setMyUserId(Number.isFinite(parsed) ? parsed : null)
      setIsAdmin(me?.role === "ADMIN")
    })()
  }, [companyName])

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    await runSearch(0)
  }

  const goToPage = async (targetPage: number) => {
    if (targetPage < 0 || targetPage === page) return
    if (targetPage >= totalPages) return
    if (isLoading || isSearching || isLoadingMore) return
    setMessage(null)
    if (isSearchMode && searchQuery.trim()) await runSearch(targetPage)
    else await loadPosts(targetPage)
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
    if (isSearchMode && searchQuery.trim()) await runSearch(page)
    else await loadPosts(page)
  }

  const handleUpdate = async (postId: number) => {
    if (!editTitle.trim() || !editContent.trim()) return
    setIsEditing(true)
    setMessage(null)
    try {
      await updateBoardPost(companyName, postId, editTitle, editContent)
      setMessage("게시글을 수정했습니다.")
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
      setMessage("게시글을 삭제했습니다.")
      await reloadCurrent()
    } catch (error) {
      const text = error instanceof Error ? error.message : "게시글 삭제에 실패했습니다."
      setMessage(text)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBlockAuthor = async (userId: number | null) => {
    if (userId == null) return
    try {
      await blockUser(userId)
      setMessage("해당 사용자를 차단했습니다.")
      await reloadCurrent()
    } catch (error) {
      const text = error instanceof Error ? error.message : "차단 처리에 실패했습니다."
      setMessage(text)
    }
  }

  const paginationBlockStart = Math.floor(page / PAGE_GROUP_SIZE) * PAGE_GROUP_SIZE
  const paginationPages = Array.from({ length: PAGE_GROUP_SIZE }, (_, index) => paginationBlockStart + index).filter(
    (value) => value < totalPages,
  )
  const canGoPrevPage = page > 0
  const canGoNextPage = page < totalPages - 1
  const canGoPrevBlock = paginationBlockStart > 0
  const canGoNextBlock = paginationBlockStart + PAGE_GROUP_SIZE < totalPages

  return (
    <div className="page-shell [--page-max:1280px] space-y-6 py-6">
      <section className={boardTheme.heroSection}>
        <div className={boardTheme.heroTopLine} />
        <div className={boardTheme.heroGlowRight} />
        <div className={boardTheme.heroGlowLeft} />
        <div className="relative">
          <p className={boardTheme.heroEyebrow}>Board Home</p>
          <h1 className={boardTheme.heroTitle}>{companyName}</h1>
          <p className={boardTheme.heroDescription}>
            {companyName} 지원 후기, 면접 질문, 전형 정보, 발표 일정 흐름을 게시글로 확인해 보세요.
          </p>
          <p className={`mt-3 max-w-3xl text-sm leading-6 ${boardTheme.metaText}`}>
            {companyName} 채용 게시판입니다. 실제 지원 경험, 면접 질문, 전형 단계별 후기, 발표 일정 관련 정보를 모아 빠르게 탐색할 수 있습니다.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={writeHref}>
              <Button type="button" className={`h-10 ${boardTheme.solidButton}`}>게시글 작성하기</Button>
            </Link>
            <Link href={`/board/${companySlug}/summary`}>
              <Button type="button" variant="outline" className={`h-10 ${boardTheme.outlineButton}`}>정보 요약 보기</Button>
            </Link>
            <Link href={`/search?company=${encodeURIComponent(companyName)}`}>
              <Button type="button" variant="outline" className={`h-10 ${boardTheme.outlineButton}`}>회사 상세 검색</Button>
            </Link>
            <Link href="/board">
              <Button type="button" variant="ghost" className={`h-10 ${boardTheme.ghostButton}`}>다른 회사 찾기</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className={`${boardTheme.card} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className={`text-base font-semibold ${boardTheme.titleText}`}>게시글 검색</h2>
          <span className={boardTheme.tag}>{isSearchMode ? "검색결과" : "전체 목록"}</span>
        </div>

        <form className="flex flex-wrap gap-2" onSubmit={handleSearch}>
          <select value={searchField} onChange={(e) => setSearchField(e.target.value as SearchField)} className={boardTheme.fieldSelect}>
            <option value="title">제목</option>
            <option value="content">내용</option>
          </select>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색어를 입력해 주세요."
            className={`h-10 w-full min-w-0 flex-1 ${boardTheme.field}`}
          />
          <Button type="submit" className={`h-10 ${boardTheme.solidButton}`} disabled={isSearching}>
            {isSearching ? "검색 중..." : "검색"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-10 ${boardTheme.outlineButton}`}
            onClick={() => {
              setTotalPages(0)
              void loadPosts(0)
            }}
          >
            전체 보기
          </Button>
        </form>
      </section>

      {message && <div className={`${boardTheme.card} px-3 py-2 text-sm ${boardTheme.metaText}`}>{message}</div>}

      <section className="space-y-3">
        {isLoading ? (
          <div className={`${boardTheme.card} p-6 text-sm ${boardTheme.metaText}`}>불러오는 중...</div>
        ) : posts.length === 0 ? (
          <EmptyState title="게시글이 없습니다" description="검색 조건을 바꾸거나 첫 게시글을 작성해 보세요." />
        ) : (
          <>
            {posts.map((post) => {
              const canEdit = isAdmin || (myUserId != null && post.authorUserId != null && myUserId === post.authorUserId)
              const isEditingPost = editingPostId === post.postId

              return (
                <article
                  key={post.postId}
                  onClick={() => {
                    if (!isEditingPost) router.push(`${boardHref}/posts/${post.postId}`)
                  }}
                  className={`${boardTheme.card} cursor-pointer p-4 ${boardTheme.hoverCard}`}
                >
                  {isEditingPost ? (
                    <div className="space-y-3">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} className={boardTheme.field} />
                      <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className={`min-h-[140px] ${boardTheme.field}`} maxLength={3000} />
                      <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                        <Button type="button" onClick={() => void handleUpdate(post.postId)} disabled={isEditing} className={boardTheme.solidButton}>
                          {isEditing ? "수정 중..." : "수정 완료"}
                        </Button>
                        <Button type="button" variant="outline" onClick={cancelEdit} className={boardTheme.outlineButton}>취소</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className={`text-lg font-semibold ${boardTheme.titleText}`}>{post.title}</h3>
                        <span className={boardTheme.tag}>#{post.postId}</span>
                      </div>
                      <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${boardTheme.metaText}`}>
                        <span className={boardTheme.authorChip}>{post.authorName}</span>
                        <span>·</span>
                        <span>{formatDate(post.createdAt)}</span>
                        {myUserId != null && post.authorUserId != null && myUserId !== post.authorUserId && (
                          <button
                            type="button"
                            className="rounded-full border border-[#d8e2f8] px-2 py-0.5 transition-colors hover:bg-[#f5f8ff] dark:border-[#365168] dark:text-[#dceefe] dark:hover:bg-[#15273a]"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleBlockAuthor(post.authorUserId)
                            }}
                          >
                            차단
                          </button>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                        <Link href={`${boardHref}/posts/${post.postId}`} onClick={(event) => event.stopPropagation()}>
                          <Button type="button" variant="outline" className={boardTheme.outlineButton}>자세히 보기</Button>
                        </Link>
                        {canEdit && (
                          <>
                            <Button type="button" variant="outline" className={boardTheme.outlineButton} onClick={(event) => { event.stopPropagation(); startEdit(post) }}>
                              수정
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className={boardTheme.outlineButton}
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

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button type="button" variant="outline" className={boardTheme.outlineButton} onClick={() => void goToPage(Math.max(0, paginationBlockStart - PAGE_GROUP_SIZE))} disabled={!canGoPrevBlock || isLoadingMore || isLoading || isSearching}>
                  {"<<"}
                </Button>
                <Button type="button" variant="outline" className={boardTheme.outlineButton} onClick={() => void goToPage(page - 1)} disabled={!canGoPrevPage || isLoadingMore || isLoading || isSearching}>
                  {"<"}
                </Button>
                {paginationPages.map((pageNumber) => (
                  <Button
                    key={`page-${pageNumber}`}
                    type="button"
                    variant={pageNumber === page ? "default" : "outline"}
                    onClick={() => void goToPage(pageNumber)}
                    disabled={isLoadingMore || isLoading || isSearching}
                    className={pageNumber === page ? `min-w-10 ${boardTheme.solidButton}` : `min-w-10 ${boardTheme.outlineButton}`}
                  >
                    {pageNumber + 1}
                  </Button>
                ))}
                <Button type="button" variant="outline" className={boardTheme.outlineButton} onClick={() => void goToPage(page + 1)} disabled={!canGoNextPage || isLoadingMore || isLoading || isSearching}>
                  {">"}
                </Button>
                <Button type="button" variant="outline" className={boardTheme.outlineButton} onClick={() => void goToPage(Math.min(totalPages - 1, paginationBlockStart + PAGE_GROUP_SIZE))} disabled={!canGoNextBlock || isLoadingMore || isLoading || isSearching}>
                  {">>"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
