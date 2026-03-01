"use client"

import { useEffect, useState } from "react"
import {
  fetchAdminReports,
  processAdminReport,
  discardAdminReport,
  updateAdminReport,
} from "@/lib/api"
import type {
  ReportItem,
  RecruitmentMode,
  RollingReportType,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type EditFormState = {
  companyName: string
  recruitmentMode: RecruitmentMode
  rollingResultType: RollingReportType
  prevReportedDate: string
  prevStepName: string
  currentStepName: string
  reportedDate: string
  noResponse: boolean
}

const toDateInput = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "")

export default function AdminReportPage() {
  const [reports, setReports] = useState<ReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadReports = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const data = await fetchAdminReports("PENDING")
      setReports(data ?? [])
    } catch (error) {
      console.error("Failed to load reports", error)
      setMessage("由ы룷??紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleProcess = async (report: ReportItem) => {
    if (report.onHold) return
    setMessage(null)
    try {
      await processAdminReport(report.reportId)
      await loadReports()
    } catch (error) {
      console.error("Failed to process report", error)
      setMessage("泥섎━???ㅽ뙣?덉뒿?덈떎.")
    }
  }

  const handleDiscard = async (reportId: number) => {
    setMessage(null)
    try {
      await discardAdminReport(reportId)
      await loadReports()
    } catch (error) {
      console.error("Failed to discard report", error)
      setMessage("?먭린???ㅽ뙣?덉뒿?덈떎.")
    }
  }

  const beginEdit = (report: ReportItem) => {
    setEditingId(report.reportId)
    const rawCurrent = (report.currentStepName ?? "").trim()
    const isNoResponse =
      report.rollingResultType === "NO_RESPONSE_REPORTED" ||
      (!report.prevReportedDate && !report.reportedDate)
    setEditForm({
      companyName: report.companyName,
      recruitmentMode: report.recruitmentMode,
      rollingResultType: report.rollingResultType ?? "DATE_REPORTED",
      prevReportedDate: report.prevReportedDate ? toDateInput(report.prevReportedDate) : "",
      prevStepName: (report.prevStepName ?? "").trim(),
      currentStepName: rawCurrent,
      reportedDate: toDateInput(report.reportedDate),
      noResponse: isNoResponse,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    if (!editingId || !editForm) return

    const isNonRolling = editForm.recruitmentMode !== "ROLLING"
    const currentStepName = editForm.currentStepName.trim()

    if (!currentStepName) {
      setMessage("?꾩옱 ?꾪삎紐낆쓣 ?낅젰??二쇱꽭??")
      return
    }
    if (!editForm.noResponse && !editForm.prevStepName.trim()) {
      setMessage("?댁쟾 ?꾪삎紐낆쓣 ?낅젰??二쇱꽭??")
      return
    }

    if (!editForm.noResponse) {
      if (!editForm.prevReportedDate || !editForm.reportedDate) {
        setMessage("?댁쟾 諛쒗몴?쇨낵 ?꾩옱 諛쒗몴?쇱쓣 ?낅젰??二쇱꽭??")
        return
      }
      if (new Date(editForm.prevReportedDate) >= new Date(editForm.reportedDate)) {
        setMessage("?댁쟾 諛쒗몴?쇱? ?꾩옱 諛쒗몴?쇰낫???댁쟾 ?좎쭨?ъ빞 ?⑸땲??")
        return
      }
    }

    try {
      await updateAdminReport(editingId, {
        companyName: editForm.companyName.trim(),
        recruitmentMode: editForm.recruitmentMode,
        rollingResultType: isNonRolling
          ? undefined
          : editForm.noResponse
            ? "NO_RESPONSE_REPORTED"
            : "DATE_REPORTED",
        prevReportedDate: editForm.noResponse ? undefined : editForm.prevReportedDate,
        prevStepName: editForm.noResponse ? undefined : editForm.prevStepName.trim(),
        currentStepName: currentStepName,
        reportedDate: editForm.noResponse ? undefined : editForm.reportedDate,
      })
      await loadReports()
      cancelEdit()
    } catch (error) {
      console.error("Failed to update report", error)
      setMessage("?섏젙???ㅽ뙣?덉뒿?덈떎.")
    }
  }

  return (
    <div className="page-shell [--page-max:64rem] py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">由ы룷??泥섎━</h1>
        <p className="text-sm text-muted-foreground mt-1">
          蹂대쪟 ?곹깭(?뚯깋)???꾩닔 ?곗씠?곌? 遺議깊빐 ?먮룞 泥섎━?????녿뒗 由ы룷?몄엯?덈떎.
        </p>
      </div>

      {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}

      {isLoading ? (
        <div className="py-10 text-sm text-muted-foreground">遺덈윭?ㅻ뒗 以?..</div>
      ) : reports.length === 0 ? (
        <div className="py-10 text-sm text-muted-foreground">由ы룷?멸? ?놁뒿?덈떎.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isEditing = editingId === report.reportId
            const isOnHold = report.onHold
            const isRegular = report.recruitmentMode === "REGULAR"
            const isIntern = report.recruitmentMode === "INTERN"
            const isNoResponse =
              report.rollingResultType === "NO_RESPONSE_REPORTED" ||
              (!report.prevReportedDate && !report.reportedDate)
            const currentStepLabel = report.currentStepName ?? "-"
            const modeLabel = isRegular ? "공채" : isIntern ? "인턴" : "수시"

            return (
              <div
                key={`report-${report.reportId}`}
                className={cn(
                  "rounded-2xl border border-border/60 bg-card p-4",
                  isOnHold && "bg-muted/40",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{report.companyName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {modeLabel} · {isNoResponse ? "결과 미수신" : "날짜 제보"}
                    </p>
                    <p className="text-sm text-muted-foreground">중복 제보: {report.reportCount}건</p>
                    <p className="text-sm text-muted-foreground">
                      이전 발표일: {report.prevReportedDate ? toDateInput(report.prevReportedDate) : "-"} ·
                      현재 발표일: {report.reportedDate ? toDateInput(report.reportedDate) : "-"}
                    </p>
                    <p className="text-sm mt-1">
                      이전 전형명: {report.prevStepName ?? "-"}
                    </p>
                    <p className="text-sm">
                      현재 전형명: {currentStepLabel}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs rounded-full border px-3 py-1 text-muted-foreground">
                      {report.status}
                    </span>
                    {isOnHold && (
                      <span className="text-xs rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-700">
                        蹂대쪟
                      </span>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => handleProcess(report)}
                      disabled={isOnHold || report.status !== "PENDING"}
                    >
                      泥섎━
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDiscard(report.reportId)}
                      disabled={report.status !== "PENDING"}
                    >
                      ?먭린
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => beginEdit(report)}>
                      ?섏젙
                    </Button>
                  </div>
                )}

                {isEditing && editForm && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">회사명</label>
                      <Input
                        value={editForm.companyName}
                        onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">전형</label>
                      <Select
                        value={editForm.recruitmentMode}
                        onValueChange={(value) =>
                          setEditForm({ ...editForm, recruitmentMode: value as RecruitmentMode })
                        }
                        disabled
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="전형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">공채</SelectItem>
                          <SelectItem value="INTERN">인턴</SelectItem>
                          <SelectItem value="ROLLING">수시</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2 flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            noResponse: !editForm.noResponse,
                            prevReportedDate: !editForm.noResponse ? "" : editForm.prevReportedDate,
                            reportedDate: !editForm.noResponse ? "" : editForm.reportedDate,
                          })
                        }
                        className={cn(
                          "inline-flex h-10 items-center rounded-lg border px-3 text-sm transition-colors",
                          editForm.noResponse
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/60 text-muted-foreground hover:bg-muted/40",
                        )}
                      >
                        결과발표 메일을 받지 못했습니다
                      </button>
                    </div>

                    {!editForm.noResponse && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">이전 전형명</label>
                          <Input
                            value={editForm.prevStepName}
                            onChange={(e) => setEditForm({ ...editForm, prevStepName: e.target.value })}
                            placeholder="예: 1차 면접"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">이전 전형 발표일</label>
                          <Input
                            type="date"
                            value={editForm.prevReportedDate}
                            onChange={(e) => setEditForm({ ...editForm, prevReportedDate: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">현재 전형 발표일</label>
                          <Input
                            type="date"
                            value={editForm.reportedDate}
                            onChange={(e) => setEditForm({ ...editForm, reportedDate: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">현재 전형명</label>
                      <Input
                        value={editForm.currentStepName}
                        onChange={(e) => setEditForm({ ...editForm, currentStepName: e.target.value })}
                        placeholder="예: 1차 면접 발표"
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      <Button type="button" onClick={saveEdit}>
                        저장
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        취소
                      </Button>
                    </div>
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


