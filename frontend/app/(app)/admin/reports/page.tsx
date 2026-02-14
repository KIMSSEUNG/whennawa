"use client"

import { useEffect, useMemo, useState } from "react"
import {
  fetchAdminReports,
  fetchAdminReportSteps,
  processAdminReport,
  discardAdminReport,
  updateAdminReport,
} from "@/lib/api"
import type {
  ReportItem,
  ReportStatus,
  ReportStep,
  RecruitmentChannelType,
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
import { normalizeUnitCategory } from "@/lib/unit-category"

type StatusFilter = ReportStatus | "ALL"

type EditFormState = {
  companyName: string
  channelType: RecruitmentChannelType
  unitName: string
  reportedDate: string
  stepKey: string
  stepNameRaw: string
}

const toDateInput = (value: Date) => value.toISOString().slice(0, 10)

export default function AdminReportPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING")
  const [reports, setReports] = useState<ReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [stepsByReportId, setStepsByReportId] = useState<Record<number, ReportStep[]>>({})
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const filteredStatus = useMemo(
    () => (statusFilter === "ALL" ? undefined : statusFilter),
    [statusFilter],
  )

  const loadReports = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const data = await fetchAdminReports(filteredStatus)
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
  }, [filteredStatus])

  const loadSteps = async (reportId: number) => {
    if (stepsByReportId[reportId]) return
    try {
      const data = await fetchAdminReportSteps(reportId)
      setStepsByReportId((prev) => ({ ...prev, [reportId]: data ?? [] }))
    } catch (error) {
      console.error("Failed to load report steps", error)
      setStepsByReportId((prev) => ({ ...prev, [reportId]: [] }))
    }
  }

  const handleProcess = async (report: ReportItem) => {
    if (report.onHold) return
    const stepId = report.stepId ?? null

    if (!stepId) {
      setMessage("처리할 전형을 선택해 주세요.")
      return
    }

    setMessage(null)
    try {
      await processAdminReport(report.reportId, stepId)
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
    setEditForm({
      companyName: report.companyName,
      channelType: report.channelType,
      unitName: normalizeUnitCategory(report.unitName) ?? report.unitName ?? "",
      reportedDate: toDateInput(report.reportedDate),
      stepKey: report.stepId ? String(report.stepId) : "OTHER",
      stepNameRaw: report.stepNameRaw ?? "",
    })
    await loadSteps(report.reportId)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    if (!editingId || !editForm) return

    const isOther = editForm.stepKey === "OTHER"
    const stepId = !isOther && editForm.stepKey ? Number(editForm.stepKey) : null
    const stepNameRaw = isOther ? editForm.stepNameRaw.trim() : null

    if (!stepId && !stepNameRaw) {
      setMessage("전형을 선택하거나, 기타 전형명을 입력해 주세요.")
      return
    }

    try {
      await updateAdminReport(editingId, {
        companyName: editForm.companyName.trim(),
        channelType: editForm.channelType,
        unitName: editForm.unitName,
        reportedDate: editForm.reportedDate,
        stepId: stepId ?? undefined,
        stepNameRaw: stepNameRaw ?? undefined,
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

      <div className="mb-4 flex flex-wrap gap-2">
        {(["PENDING", "PROCESSED", "DISCARDED", "ALL"] as StatusFilter[]).map((status) => (
          <Button
            key={status}
            type="button"
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status)}
          >
            {status === "ALL" ? "전체" : status}
          </Button>
        ))}
      </div>

      {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}

      {isLoading ? (
        <div className="py-10 text-sm text-muted-foreground">불러오는 중...</div>
      ) : reports.length === 0 ? (
        <div className="py-10 text-sm text-muted-foreground">리포트가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const steps = stepsByReportId[report.reportId] ?? []
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
                      {report.channelType} · {toDateInput(report.reportedDate)}
                    </p>
                    <p className="text-sm text-muted-foreground">중복 제보: {report.reportCount}회</p>
                    <p className="text-sm text-muted-foreground">
                      Unit: {normalizeUnitCategory(report.unitName) ?? report.unitName ?? "-"}
                    </p>
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
                      disabled={isOnHold || report.status !== "PENDING" || !report.stepId}
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
                      <label className="text-sm font-medium">채용 채널</label>
                      <Select
                        value={editForm.channelType}
                        onValueChange={(value) =>
                          setEditForm({ ...editForm, channelType: value as RecruitmentChannelType })
                        }
                        disabled
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="채용 채널 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIRST_HALF">상반기</SelectItem>
                          <SelectItem value="SECOND_HALF">하반기</SelectItem>
                          <SelectItem value="ALWAYS">상시</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unit</label>
                      <Input value={editForm.unitName} disabled />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">결과 발표일</label>
                      <Input
                        type="date"
                        value={editForm.reportedDate}
                        onChange={(e) => setEditForm({ ...editForm, reportedDate: e.target.value })}
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">전형 선택</label>
                      <Select
                        value={editForm.stepKey}
                        onValueChange={(value) => setEditForm({ ...editForm, stepKey: value })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="전형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {steps.map((step) => (
                            <SelectItem
                              key={`edit-${report.reportId}-${step.stepId}`}
                              value={String(step.stepId)}
                            >
                              {step.stepName}
                            </SelectItem>
                          ))}
                          <SelectItem value="OTHER">기타</SelectItem>
                        </SelectContent>
                      </Select>

                      {editForm.stepKey === "OTHER" && (
                        <Input
                          value={editForm.stepNameRaw}
                          onChange={(e) => setEditForm({ ...editForm, stepNameRaw: e.target.value })}
                          placeholder="기타 전형명을 입력해 주세요."
                        />
                      )}
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
