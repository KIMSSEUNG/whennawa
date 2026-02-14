"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Client, IMessage, StompSubscription } from "@stomp/stompjs"
import SockJS from "sockjs-client"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { fetchChatMessages, getUser } from "@/lib/api"
import type { ChatMessage } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type CompanyChatRoomProps = {
  companyId: number | null
  companyName?: string
}

const MAX_MESSAGE_LENGTH = 300

const formatTimestamp = (value: Date) =>
  value.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

const toSocketBaseUrl = () => {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")
  if (raw) return raw
  if (typeof window !== "undefined") return window.location.origin
  return ""
}

export function CompanyChatRoom({ companyId, companyName }: CompanyChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState("")
  const [isJoined, setIsJoined] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const clientRef = useRef<Client | null>(null)
  const subscriptionRef = useRef<StompSubscription | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const topic = useMemo(() => (companyId ? `/sub/chat/room/${companyId}` : null), [companyId])

  useEffect(() => {
    if (!companyId || !topic) return
    let cancelled = false
    ;(async () => {
      const recent = await fetchChatMessages(companyId, 30).catch(() => [])
      if (!cancelled) setMessages(recent)
    })()
    return () => {
      cancelled = true
    }
  }, [companyId, topic])

  useEffect(() => {
    if (!isJoined || !companyId || !topic) return
    const socketBaseUrl = toSocketBaseUrl()
    if (!socketBaseUrl) return

    const client = new Client({
      reconnectDelay: 3000,
      webSocketFactory: () => new SockJS(`${socketBaseUrl}/ws-stomp`),
      onConnect: () => {
        subscriptionRef.current = client.subscribe(topic, (frame: IMessage) => {
          const payload = JSON.parse(frame.body) as {
            companyId: number
            senderNickname: string
            message: string
            timestamp: string
          }
          setMessages((prev) => [
            ...prev,
            {
              companyId: payload.companyId,
              senderNickname: payload.senderNickname,
              message: payload.message,
              timestamp: new Date(payload.timestamp),
            },
          ])
        })
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
      clientRef.current?.deactivate()
      clientRef.current = null
    }
  }, [isJoined, companyId, topic])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const sendMessage = () => {
    const trimmed = message.trim()
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return
    if (!companyId || !clientRef.current?.connected) return
    clientRef.current.publish({
      destination: "/pub/chat/message",
      body: JSON.stringify({
        companyId,
        message: trimmed,
      }),
    })
    setMessage("")
  }

  const joinChat = async () => {
    if (!companyId) return
    setIsJoining(true)
    const user = await getUser().catch(() => null)
    setIsJoining(false)
    if (!user) {
      const query = searchParams?.toString()
      const nextPath = query ? `${pathname}?${query}` : pathname
      router.replace(`/login?reason=auth_required&next=${encodeURIComponent(nextPath)}`)
      return
    }
    setNickname(user.name ?? null)
    setIsJoined(true)
  }

  if (!companyId) return null

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/10 to-accent/30 px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">{companyName ? `${companyName} 채팅` : "회사 채팅"}</h3>
        <p className="text-xs text-muted-foreground">
          {isJoined ? "실시간으로 대화를 나누는 중입니다." : "최근 대화를 확인하고 채팅방에 참여해 보세요."}
        </p>
      </div>

      <div ref={listRef} className="h-64 overflow-y-auto rounded-xl border border-border/60 bg-background p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">아직 채팅 메시지가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((item, index) => {
              const isMine = nickname != null && item.senderNickname === nickname
              return (
                <div
                  key={`${item.timestamp.toISOString()}-${index}`}
                  className={cn("flex items-start gap-2", isMine && "justify-end")}
                >
                  {!isMine && (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                      {item.senderNickname.slice(0, 1)}
                    </span>
                  )}

                  <article
                    className={cn(
                      "max-w-[85%] rounded-2xl border px-3 py-2",
                      isMine
                        ? "border-primary/20 bg-primary/10 text-foreground"
                        : "border-border/60 bg-card text-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-muted-foreground">{item.senderNickname}</span>
                      <span className="text-[10px] text-muted-foreground">{formatTimestamp(item.timestamp)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.message}</p>
                  </article>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!isJoined ? (
        <div className="mt-3">
          <Button type="button" onClick={joinChat} disabled={isJoining} className="w-full">
            {isJoining ? "입장 중..." : "채팅방 들어가기"}
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">메시지 입력</span>
            <span className="text-xs text-muted-foreground">
              {message.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={message}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="메시지를 입력해 주세요."
              className="h-10"
            />
            <Button type="button" onClick={sendMessage} className="px-4">
              전송
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
