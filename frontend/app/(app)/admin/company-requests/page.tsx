"use client"

import { useEffect, useState } from "react"
import {
  discardAdminCompanyNameRequest,
  fetchAdminCompanyNameRequests,
  processAdminCompanyNameRequest,
  updateAdminCompanyNameRequest,
} from "@/lib/api"
import type { CompanyNameRequestItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function AdminCompanyRequestsPage() {
  const [items, setItems] = useState<CompanyNameRequestItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const loadItems = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const data = await fetchAdminCompanyNameRequests("PENDING")
      setItems(data ?? [])
    } catch (error) {
      console.error("Failed to load company requests", error)
      setMessage("회사 추가 요청을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const beginEdit = (item: CompanyNameRequestItem) => {
    setEditingId(item.requestId)
    setEditingName(item.normalizedCompanyName)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  const saveEdit = async () => {
    if (!editingId) return
    const next = editingName.trim()
    if (!next) {
      setMessage("회사명을 입력해 주세요.")
      return
    }
    try {
      const updated = await updateAdminCompanyNameRequest(editingId, next)
      setItems((prev) => prev.map((item) => (item.requestId === updated.requestId ? updated : item)))
      setMessage("요청 내용을 수정했습니다.")
      cancelEdit()
    } catch (error) {
      console.error("Failed to update company request", error)
      setMessage(error instanceof Error ? error.message : "수정에 실패했습니다.")
    }
  }

  const handleProcess = async (item: CompanyNameRequestItem) => {
    if (item.alreadyExists) {
      const ok = window.confirm(`해당 회사는 이미 있습니다 (${item.existingCompanyName ?? item.normalizedCompanyName}). 중복 요청으로 처리할까요?`)
      if (!ok) return
    }
    try {
      const processed = await processAdminCompanyNameRequest(item.requestId)
      setMessage(processed.message ?? "요청을 처리했습니다.")
      await loadItems()
    } catch (error) {
      console.error("Failed to process company request", error)
      setMessage(error instanceof Error ? error.message : "처리에 실패했습니다.")
    }
  }

  const handleDiscard = async (requestId: number) => {
    try {
      const discarded = await discardAdminCompanyNameRequest(requestId)
      setMessage(discarded.message ?? "요청을 폐기했습니다.")
      await loadItems()
    } catch (error) {
      console.error("Failed to discard company request", error)
      setMessage(error instanceof Error ? error.message : "폐기에 실패했습니다.")
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">회사 추가 검수</h1>
        <p className="text-sm text-muted-foreground mt-1">사용자 회사 추가 요청(PENDING)을 승인/폐기합니다.</p>
      </div>

      {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}

      {isLoading ? (
        <div className="py-10 text-sm text-muted-foreground">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-sm text-muted-foreground">검수할 회사 추가 요청이 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isEditing = editingId === item.requestId
            return (
              <div key={item.requestId} className={cn("rounded-2xl border border-border/60 bg-card p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{item.normalizedCompanyName}</h3>
                    <p className="text-sm text-muted-foreground">원본 입력: {item.originalCompanyName}</p>
                    <p className="text-sm text-muted-foreground">중복 요청 수: {item.requestCount}회</p>
                    {item.alreadyExists && (
                      <p className="mt-1 text-sm text-amber-700">
                        해당 회사는 이미 있습니다: {item.existingCompanyName ?? item.normalizedCompanyName}
                      </p>
                    )}
                  </div>
                  <span className="text-xs rounded-full border px-3 py-1 text-muted-foreground">{item.status}</span>
                </div>

                {!isEditing ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => handleProcess(item)}>
                      처리
                    </Button>
                    <Button type="button" variant="outline" onClick={() => handleDiscard(item.requestId)}>
                      폐기
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => beginEdit(item)}>
                      수정
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="max-w-sm" />
                    <Button type="button" onClick={saveEdit}>
                      저장
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      취소
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
