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
      setMessage("리포트 목록을 불러오지 못했습니다.")
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
      await processAdminReport(report.reportId, null)
      await loadReports()
    } catch (error) {
      console.error("Failed to process report", error)
      setMessage("처리에 실패했습니다.")
    }
  }

  const handleDiscard = async (reportId: number) => {
    setMessage(null)
    try {
      await discardAdminReport(reportId)
      await loadReports()
    } catch (error) {
      console.error("Failed to discard report", error)
      setMessage("폐기에 실패했습니다.")
    }
  }

  const beginEdit = async (report: ReportItem) => {
    setEditingId(report.reportId)
    const rawCurrent = (report.stepNameRaw ?? report.stepName ?? "").trim()
    const isNoResponse =
      report.rollingResultType === "NO_RESPONSE_REPORTED" ||
      (!report.prevReportedDate && !report.reportedDate)
    setEditForm({
      companyName: report.companyName,
      recruitmentMode: report.recruitmentMode,
      rollingResultType: report.rollingResultType ?? "DATE_REPORTED",
      prevReportedDate: report.prevReportedDate ? toDateInput(report.prevReportedDate) : "",
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

    const isRegular = editForm.recruitmentMode === "REGULAR"
    const currentStepName = editForm.currentStepName.trim()

    if (!currentStepName) {
      setMessage("현재 전형명을 입력해 주세요.")
      return
    }

    if (!editForm.noResponse) {
      if (!editForm.prevReportedDate || !editForm.reportedDate) {
        setMessage("이전 발표일과 현재 발표일을 입력해 주세요.")
        return
      }
      if (new Date(editForm.prevReportedDate) >= new Date(editForm.reportedDate)) {
        setMessage("이전 발표일은 현재 발표일보다 이전 날짜여야 합니다.")
        return
      }
    }

    try {
      await updateAdminReport(editingId, {
        companyName: editForm.companyName.trim(),
        recruitmentMode: editForm.recruitmentMode,
        rollingResultType: isRegular
          ? undefined
          : editForm.noResponse
            ? "NO_RESPONSE_REPORTED"
            : "DATE_REPORTED",
        prevReportedDate: editForm.noResponse ? undefined : editForm.prevReportedDate,
        currentStepName: isRegular ? undefined : currentStepName,
        reportedDate: editForm.noResponse ? undefined : editForm.reportedDate,
        stepId: undefined,
        stepNameRaw: isRegular ? currentStepName : undefined,
      })
      await loadReports()
      cancelEdit()
    } catch (error) {
      console.error("Failed to update report", error)
      setMessage("수정에 실패했습니다.")
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">리포트 처리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          보류 상태(회색)는 해당 월/채용 채널 기준으로 비활성화된 리포트입니다.
        </p>
      </div>

      {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}

      {isLoading ? (
        <div className="py-10 text-sm text-muted-foreground">불러오는 중...</div>
      ) : reports.length === 0 ? (
        <div className="py-10 text-sm text-muted-foreground">리포트가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isEditing = editingId === report.reportId
            const isOnHold = report.onHold

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
                      {report.recruitmentMode === "REGULAR"
                        ? `${toDateInput(report.reportedDate)}`
                        : `수시 · ${report.rollingResultType === "NO_RESPONSE_REPORTED" ? "결과 미수신" : toDateInput(report.reportedDate)}`}
                    </p>
                    <p className="text-sm text-muted-foreground">중복 제보: {report.reportCount}회</p>
                    {report.recruitmentMode !== "REGULAR" && (
                      <p className="text-sm text-muted-foreground">
                        유형: {report.rollingResultType === "NO_RESPONSE_REPORTED" ? "결과 미수신" : "날짜 제보"} ·
                        이전 발표일: {report.prevReportedDate ? toDateInput(report.prevReportedDate) : "-"} · 현재 전형: {report.currentStepName ?? "-"}
                      </p>
                    )}
                    <p className="text-sm mt-1">
                      {report.stepName
                        ? report.stepName
                        : report.stepNameRaw
                          ? `기타: ${report.stepNameRaw}`
                          : "-"}
                    </p>
                  </div>

                  <span className="text-xs rounded-full border px-3 py-1 text-muted-foreground">
                    {report.status}
                  </span>
                </div>

                {!isEditing && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => handleProcess(report)}
                      disabled={isOnHold || report.status !== "PENDING"}
                    >
                      처리
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDiscard(report.reportId)}
                      disabled={report.status !== "PENDING"}
                    >
                      폐기
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => beginEdit(report)}>
                      수정
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
                      <label className="text-sm font-medium">유형</label>
                      <Select
                        value={editForm.recruitmentMode}
                        onValueChange={(value) =>
                          setEditForm({ ...editForm, recruitmentMode: value as RecruitmentMode })
                        }
                        disabled
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">공채</SelectItem>
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
                        placeholder="예: 1차면접"
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
