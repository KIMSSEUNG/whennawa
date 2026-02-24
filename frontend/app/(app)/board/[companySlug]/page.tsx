"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { createBoardPost, deleteBoardPost, fetchBoardPosts, getUser, searchBoardPosts, updateBoardPost } from "@/lib/api"
import { fromCompanySlug } from "@/lib/company-slug"
import type { BoardPost } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/empty-state"

type SearchField = "title" | "content"

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
  const companyName = useMemo(() => fromCompanySlug(params?.companySlug ?? ""), [params?.companySlug])

  const [posts, setPosts] = useState<BoardPost[]>([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [searchField, setSearchField] = useState<SearchField>("title")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)

  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPosts = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const data = await fetchBoardPosts(companyName, 100)
      setPosts(data)
      setIsSearchMode(false)
    } catch (error) {
      const text = error instanceof Error ? error.message : "�Խñ��� �ҷ����� ���߽��ϴ�."
      setMessage(text)
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPosts()
    void (async () => {
      const me = await getUser().catch(() => null)
      const parsed = me?.id ? Number(me.id) : NaN
      setMyUserId(Number.isFinite(parsed) ? parsed : null)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName])

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return
    setIsSubmitting(true)
    setMessage(null)
    try {
      await createBoardPost(companyName, title, content)
      setTitle("")
      setContent("")
      setMessage("�Խñ��� ��ϵǾ����ϴ�.")
      await loadPosts()
    } catch (error) {
      const text = error instanceof Error ? error.message : "�Խñ� ��Ͽ� �����߽��ϴ�."
      setMessage(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!searchQuery.trim()) {
      await loadPosts()
      return
    }
    setIsSearching(true)
    setMessage(null)
    try {
      const data = await searchBoardPosts(companyName, searchQuery.trim(), searchField, 100)
      setPosts(data)
      setIsSearchMode(true)
    } catch (error) {
      const text = error instanceof Error ? error.message : "�Խ��� �˻��� �����߽��ϴ�."
      if (text.includes("cooldown") || text.includes("429") || text.includes("3 seconds")) {
        setMessage("�˻��� 3�ʸ��� �����մϴ�. ��� �� �ٽ� �õ��� �ּ���.")
      } else {
        setMessage(text)
      }
    } finally {
      setIsSearching(false)
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

  const handleUpdate = async (postId: number) => {
    if (!editTitle.trim() || !editContent.trim()) return
    setIsEditing(true)
    setMessage(null)
    try {
      await updateBoardPost(companyName, postId, editTitle, editContent)
      setMessage("�Խñ��� �����Ǿ����ϴ�.")
      cancelEdit()
      if (isSearchMode && searchQuery.trim()) {
        const data = await searchBoardPosts(companyName, searchQuery.trim(), searchField, 100)
        setPosts(data)
      } else {
        await loadPosts()
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "�Խñ� ������ �����߽��ϴ�."
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
      setMessage("�Խñ��� �����Ǿ����ϴ�.")
      if (isSearchMode && searchQuery.trim()) {
        const data = await searchBoardPosts(companyName, searchQuery.trim(), searchField, 100)
        setPosts(data)
      } else {
        await loadPosts()
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "�Խñ� ������ �����߽��ϴ�."
      setMessage(text)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-6">
      <section className="mb-6 rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">ȸ�� �Խ���</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{companyName}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/search?company=${encodeURIComponent(companyName)}`}>
            <Button type="button" variant="outline">ȸ�� ������ ��¥����</Button>
          </Link>
          <Link href="/board">
            <Button type="button" variant="ghost">�ٸ� ȸ�� �Խ��� ã��</Button>
          </Link>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">�Խ��� �˻�</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={handleSearch}>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="title">����</option>
            <option value="content">����</option>
          </select>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="�˻�� �Է��� �ּ���."
            className="h-10 min-w-[220px] flex-1"
          />
          <Button type="submit" disabled={isSearching}>{isSearching ? "�˻� ��..." : "�˻�"}</Button>
          <Button type="button" variant="outline" onClick={() => void loadPosts()}>��ü ���</Button>
        </form>
      </section>

      <section className="mb-6 rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">�Խñ� �ۼ�</h2>
        <form className="mt-3 space-y-3" onSubmit={handleCreatePost}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="������ �Է��� �ּ���."
            maxLength={120}
            required
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="������ �Է��� �ּ���."
            className="min-h-[140px]"
            maxLength={3000}
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "��� ��..." : "�Խñ� ���"}
          </Button>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
          <p className="text-xs text-muted-foreground">�Խñ� �ۼ�/����/������ �α��� ����� �� �ۼ��� ���θ� �����մϴ�.</p>
        </form>
      </section>

      <section className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">�ҷ����� ��...</div>
        ) : posts.length === 0 ? (
          <EmptyState title="�Խñ��� �����ϴ�" description="�˻� ������ �ٲٰų� �� �Խñ��� ����� ������." />
        ) : (
          posts.map((post) => {
            const canEdit = myUserId != null && post.authorUserId != null && myUserId === post.authorUserId
            const isEditingPost = editingPostId === post.postId
            return (
              <article key={post.postId} className="rounded-2xl border border-border/60 bg-card p-4">
                {isEditingPost ? (
                  <div className="space-y-2">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} />
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[120px]" maxLength={3000} />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => void handleUpdate(post.postId)} disabled={isEditing}>
                        {isEditing ? "���� ��..." : "���� ����"}
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit}>���</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-foreground">{post.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{post.content}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{post.authorName}</span>
                      <span>��</span>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                    {canEdit && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => startEdit(post)}>����</Button>
                        <Button type="button" variant="outline" onClick={() => void handleDelete(post.postId)} disabled={isDeleting}>
                          {isDeleting ? "���� ��..." : "����"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
