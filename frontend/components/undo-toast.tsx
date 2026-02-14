"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UndoToastProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
  duration?: number
}

export function UndoToast({ message, onUndo, onDismiss, duration = 5000 }: UndoToastProps) {
  const [progress, setProgress] = useState(100)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - 100 / (duration / 100)
        if (next <= 0) {
          clearInterval(interval)
          setIsVisible(false)
          setTimeout(onDismiss, 300)
          return 0
        }
        return next
      })
    }, 100)

    return () => clearInterval(interval)
  }, [duration, onDismiss])

  const handleUndo = () => {
    setIsVisible(false)
    setTimeout(onUndo, 300)
  }

  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 md:bottom-8",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )}
    >
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg flex items-center gap-3">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-primary font-medium" onClick={handleUndo}>
          실행 취소
        </Button>
        <button onClick={onDismiss} className="text-sm text-muted-foreground hover:text-foreground">
          닫기
        </button>
        <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
