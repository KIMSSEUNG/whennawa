"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  createBoardComment,
  deleteBoardComment,
  deleteBoardPost,
  fetchBoardComments,
  fetchBoardPost,
  getUser,
  likeBoardComment,
  unlikeBoardComment,
  updateBoardComment,
  updateBoardPost,
} from "@/lib/api"
import type { BoardComment, BoardPost } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/empty-state"
import { CAREER_BOARD_COMPANY_NAME, CAREER_BOARD_PATH } from "@/lib/career-board"

const COMMENT_PAGE_SIZE = 10
const COMMENT_COLLAPSE_LIMIT = 500

function formatDate(value: Date) {
  return value.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function CommentContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = content.length > COMMENT_COLLAPSE_LIMIT
  const display = long && !expanded ? `${content.slice(0, COMMENT_COLLAPSE_LIMIT)}...` : content

  return (
    <div>
      <p className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-foreground/95">
        {display}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-xs text-muted-foreground underline underline-offset-2"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  )
}

export default function CareerBoardPostDetailPage() {
  const params = useParams<{ postId: string }>()
  const router = useRouter()

  const companyName = CAREER_BOARD_COMPANY_NAME
  const postId = useMemo(() => Number(params?.postId ?? NaN), [params?.postId])
  const boardHref = CAREER_BOARD_PATH

  const [post, setPost] = useState<BoardPost | null>(null)
  const [isLoadingPost, setIsLoadingPost] = useState(true)

  const [comments, setComments] = useState<BoardComment[]>([])
  const [commentPage, setCommentPage] = useState(0)
  const [commentHasNext, setCommentHasNext] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false)

  const [message, setMessage] = useState<string | null>(null)
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [isSubmittingPost, setIsSubmittingPost] = useState(false)
  const [isDeletingPost, setIsDeletingPost] = useState(false)

  const [newCommentContent, setNewCommentContent] = useState("")
  const [newCommentAnonymous, setNewCommentAnonymous] = useState(false)
  const [isCreatingComment, setIsCreatingComment] = useState(false)

  const [replyTargetId, setReplyTargetId] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [replyAnonymous, setReplyAnonymous] = useState(false)
  const [isCreatingReply, setIsCreatingReply] = useState(false)

  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingCommentContent, setEditingCommentContent] = useState("")
  const [isSavingComment, setIsSavingComment] = useState(false)
  const [isDeletingComment, setIsDeletingComment] = useState(false)

  const canEditPost = isAdmin || (myUserId != null && post?.authorUserId != null && myUserId === post.authorUserId)

  const loadPost = async () => {
    if (!Number.isFinite(postId)) return
    setIsLoadingPost(true)
    try {
      const data = await fetchBoardPost(companyName, postId)
      setPost(data)
      setEditTitle(data.title)
      setEditContent(data.content)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "게시글을 불러오지 못했습니다.")
      setPost(null)
    } finally {
      setIsLoadingPost(false)
    }
  }

  const loadComments = async (reset: boolean) => {
    if (!Number.isFinite(postId)) return
    const targetPage = reset ? 0 : commentPage + 1

    if (reset) setIsLoadingComments(true)
    else setIsLoadingMoreComments(true)

    try {
      const data = await fetchBoardComments(companyName, postId, targetPage, COMMENT_PAGE_SIZE)
      setComments((prev) => (reset ? data.items : [...prev, ...data.items]))
      setCommentPage(data.page)
      setCommentHasNext(data.hasNext)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "댓글을 불러오지 못했습니다.")
    } finally {
      if (reset) setIsLoadingComments(false)
      else setIsLoadingMoreComments(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(postId)) return
    setMessage(null)
    void loadPost()
    void loadComments(true)
    void (async () => {
      const me = await getUser().catch(() => null)
      const parsed = me?.id ? Number(me.id) : NaN
      setMyUserId(Number.isFinite(parsed) ? parsed : null)
      setIsAdmin(me?.role === "ADMIN")
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  const refreshComments = async () => {
    await loadComments(true)
  }

  const handleSavePost = async () => {
    if (!post || !editTitle.trim() || !editContent.trim()) return
    setIsSubmittingPost(true)
    setMessage(null)
    try {
      const updated = await updateBoardPost(companyName, post.postId, editTitle, editContent)
      setPost(updated)
      setIsEditingPost(false)
      setMessage("게시글을 수정했습니다.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "게시글 수정에 실패했습니다.")
    } finally {
      setIsSubmittingPost(false)
    }
  }

  const handleDeletePost = async () => {
    if (!post || isDeletingPost) return
    setIsDeletingPost(true)
    setMessage(null)
    try {
      await deleteBoardPost(companyName, post.postId)
      router.push(boardHref)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "게시글 삭제에 실패했습니다.")
      setIsDeletingPost(false)
    }
  }

  const handleCreateComment = async () => {
    if (!newCommentContent.trim()) return
    setIsCreatingComment(true)
    setMessage(null)
    try {
      await createBoardComment(companyName, postId, newCommentContent, undefined, {
        anonymous: newCommentAnonymous,
      })
      setNewCommentContent("")
      setNewCommentAnonymous(false)
      await refreshComments()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "댓글 등록에 실패했습니다.")
    } finally {
      setIsCreatingComment(false)
    }
  }

  const handleCreateReply = async () => {
    if (replyTargetId == null || !replyContent.trim()) return
    setIsCreatingReply(true)
    setMessage(null)
    try {
      await createBoardComment(companyName, postId, replyContent, replyTargetId, {
        anonymous: replyAnonymous,
      })
      setReplyTargetId(null)
      setReplyContent("")
      setReplyAnonymous(false)
      await refreshComments()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "답글 등록에 실패했습니다.")
    } finally {
      setIsCreatingReply(false)
    }
  }

  const openCommentEdit = (comment: BoardComment) => {
    setEditingCommentId(comment.commentId)
    setEditingCommentContent(comment.content)
  }

  const handleSaveComment = async (commentId: number) => {
    if (!editingCommentContent.trim()) return
    setIsSavingComment(true)
    setMessage(null)
    try {
      await updateBoardComment(companyName, postId, commentId, editingCommentContent)
      setEditingCommentId(null)
      setEditingCommentContent("")
      await refreshComments()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "댓글 수정에 실패했습니다.")
    } finally {
      setIsSavingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (isDeletingComment) return
    setIsDeletingComment(true)
    setMessage(null)
    try {
      await deleteBoardComment(companyName, postId, commentId)
      await refreshComments()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "댓글 삭제에 실패했습니다.")
    } finally {
      setIsDeletingComment(false)
    }
  }

  const handleToggleLike = async (comment: BoardComment) => {
    try {
      if (comment.likedByMe) {
        await unlikeBoardComment(companyName, postId, comment.commentId)
      } else {
        await likeBoardComment(companyName, postId, comment.commentId)
      }
      await refreshComments()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.")
    }
  }

  const canEditComment = (comment: BoardComment) => {
    return isAdmin || (myUserId != null && comment.authorUserId != null && myUserId === comment.authorUserId)
  }

  const renderCommentNode = (comment: BoardComment, depth: number) => {
    const isEditingThis = editingCommentId === comment.commentId
    const canReply = depth < 2

    return (
      <div
        key={comment.commentId}
        className={depth === 0 ? "rounded-xl border border-border/60 bg-background p-3" : "rounded-lg border border-border/60 bg-card p-3"}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">{comment.authorName}</span>
          <span>·</span>
          <span>{formatDate(comment.createdAt)}</span>
          <button
            type="button"
            onClick={() => void handleToggleLike(comment)}
            className="ml-auto rounded-full border border-border/70 px-2 py-0.5 hover:bg-accent/60"
          >
            {comment.likedByMe ? "좋아요 취소" : "좋아요"} ({comment.likeCount})
          </button>
        </div>

        {isEditingThis ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editingCommentContent}
              onChange={(e) => setEditingCommentContent(e.target.value)}
              className="min-h-[90px]"
              maxLength={3000}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void handleSaveComment(comment.commentId)} disabled={isSavingComment}>
                {isSavingComment ? "저장 중..." : "저장"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingCommentId(null)}>취소</Button>
            </div>
          </div>
        ) : (
          <CommentContent content={comment.content} />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {canReply && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReplyTargetId((prev) => (prev === comment.commentId ? null : comment.commentId))
                setReplyContent("")
                setReplyAnonymous(false)
              }}
            >
              답글
            </Button>
          )}
          {canEditComment(comment) && (
            <>
              <Button type="button" variant="outline" onClick={() => openCommentEdit(comment)}>수정</Button>
              <Button type="button" variant="outline" onClick={() => void handleDeleteComment(comment.commentId)} disabled={isDeletingComment}>
                {isDeletingComment ? "삭제 중..." : "삭제"}
              </Button>
            </>
          )}
        </div>

        {replyTargetId === comment.commentId && canReply && (
          <div className="mt-3 rounded-lg border border-border/60 bg-card p-3">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="답글을 입력해 주세요."
              className="min-h-[90px]"
              maxLength={3000}
            />
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={replyAnonymous}
                onChange={(e) => setReplyAnonymous(e.target.checked)}
                className="h-4 w-4"
              />
              <span>익명으로 답글 달기</span>
            </label>
            <div className="mt-2 flex gap-2">
              <Button type="button" onClick={() => void handleCreateReply()} disabled={isCreatingReply || !replyContent.trim()}>
                {isCreatingReply ? "등록 중..." : "답글 등록"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setReplyTargetId(null)}>취소</Button>
            </div>
          </div>
        )}

        {comment.replies.length > 0 && (
          <div className="mt-3 space-y-2 border-l border-border/60 pl-3">
            {comment.replies.map((child) => renderCommentNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-shell [--page-max:1000px] space-y-6 py-6">
      <section className="rounded-3xl border border-border/60 bg-card p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Post Detail</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">취업 고민 게시글</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={boardHref}>
            <Button type="button" variant="outline">목록으로 돌아가기</Button>
          </Link>
          <Link href={`${boardHref}/write`}>
            <Button type="button">글쓰기</Button>
          </Link>
        </div>
      </section>

      {message && <div className="rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground">{message}</div>}

      {isLoadingPost ? (
        <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">게시글 불러오는 중...</div>
      ) : !post ? (
        <EmptyState title="게시글을 찾지 못했습니다" description="삭제되었거나 접근할 수 없는 게시글입니다." />
      ) : (
        <article className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
          {isEditingPost ? (
            <div className="space-y-3">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} />
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[280px]" maxLength={3000} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSavePost()} disabled={isSubmittingPost}>
                  {isSubmittingPost ? "저장 중..." : "수정 저장"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditingPost(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">{post.title}</h2>
                <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground">#{post.postId}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-0.5">{post.authorName}</span>
                <span>·</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
              <div className="mt-5 whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-xl border border-border/60 bg-background p-4 text-sm leading-7 text-foreground/95">
                {post.content}
              </div>

              {canEditPost && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditingPost(true)}>수정</Button>
                  <Button type="button" variant="outline" onClick={() => void handleDeletePost()} disabled={isDeletingPost}>
                    {isDeletingPost ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              )}
            </>
          )}
        </article>
      )}

      <section className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
        <h3 className="text-lg font-semibold text-foreground">댓글</h3>
        <div className="mt-3 space-y-2">
          <Textarea
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            placeholder="댓글을 입력해 주세요."
            className="min-h-[110px]"
            maxLength={3000}
          />
          <div className="flex flex-col items-start gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={newCommentAnonymous}
                onChange={(e) => setNewCommentAnonymous(e.target.checked)}
                className="h-4 w-4"
              />
              <span>익명으로 댓글 달기</span>
            </label>
            <Button type="button" onClick={() => void handleCreateComment()} disabled={isCreatingComment || !newCommentContent.trim()}>
              {isCreatingComment ? "등록 중..." : "댓글 등록"}
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {isLoadingComments ? (
            <div className="text-sm text-muted-foreground">댓글을 불러오는 중...</div>
          ) : comments.length === 0 ? (
            <EmptyState title="댓글이 없습니다" description="첫 댓글을 남겨 보세요." />
          ) : (
            <>
              {comments.map((comment) => renderCommentNode(comment, 0))}

              {commentHasNext && (
                <div className="flex justify-center pt-2">
                  <Button type="button" variant="outline" onClick={() => void loadComments(false)} disabled={isLoadingMoreComments}>
                    {isLoadingMoreComments ? "불러오는 중..." : "댓글 더보기"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
