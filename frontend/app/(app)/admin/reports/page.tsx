"use client"

import { useEffect, useState } from "react"
import {
  fetchAdminReports,
  fetchReportJobCategories,
  fetchRollingReportCurrentStepNames,
  processAdminReport,
  discardAdminReport,
  updateAdminReport,
} from "@/lib/api"
import type { ReportJobCategory } from "@/lib/api"
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
  jobCategoryId: string
  rollingJobName: string
  otherJobName: string
  rollingResultType: RollingReportType
  baseDate: string
  stepName: string
  reportedDate: string
  noResponse: boolean
}

const toDateInput = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "")

export default function AdminReportPage() {
  const [activeScope, setActiveScope] = useState<"regular" | "rolling">("regular")
  const [reports, setReports] = useState<ReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [editJobCategories, setEditJobCategories] = useState<ReportJobCategory[]>([])
  const [editStepSuggestions, setEditStepSuggestions] = useState<string[]>([])
  const [showEditStepSuggestions, setShowEditStepSuggestions] = useState(false)
  const [expandedInterviewReviewIds, setExpandedInterviewReviewIds] = useState<number[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const loadReports = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const data = await fetchAdminReports("PENDING", activeScope)
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
  }, [activeScope])

  const handleProcess = async (report: ReportItem) => {
    if (report.onHold) return
    setMessage(null)
    try {
      const scope = report.recruitmentMode === "ROLLING" ? "rolling" : "regular"
      await processAdminReport(report.reportId, scope)
      await loadReports()
    } catch (error) {
      console.error("Failed to process report", error)
      setMessage("처리에 실패했습니다.")
    }
  }

  const handleDiscard = async (reportId: number) => {
    setMessage(null)
    try {
      const target = reports.find((item) => item.reportId === reportId)
      const scope = target?.recruitmentMode === "ROLLING" ? "rolling" : "regular"
      await discardAdminReport(reportId, scope)
      await loadReports()
    } catch (error) {
      console.error("Failed to discard report", error)
      setMessage("폐기에 실패했습니다.")
    }
  }

  const beginEdit = async (report: ReportItem) => {
    setEditingId(report.reportId)
    const rawStep = (report.stepName ?? "").trim()
    const isNoResponse =
      report.rollingResultType === "NO_RESPONSE_REPORTED" ||
      (!report.baseDate && !report.reportedDate)
    const categories = await fetchReportJobCategories(report.companyName)
    setEditJobCategories(categories)
    const hasReportedCategory = report.jobCategoryId != null && categories.some((item) => item.jobCategoryId === report.jobCategoryId)
    const fallbackCategoryId = hasReportedCategory
      ? String(report.jobCategoryId)
      : categories[0]
        ? String(categories[0].jobCategoryId)
        : ""
    setEditForm({
      companyName: report.companyName,
      recruitmentMode: report.recruitmentMode,
      jobCategoryId: fallbackCategoryId,
      rollingJobName: (report.jobCategoryName ?? report.otherJobName ?? "").trim(),
      otherJobName: report.otherJobName ?? "",
      rollingResultType: report.rollingResultType ?? "DATE_REPORTED",
      baseDate: report.baseDate ? toDateInput(report.baseDate) : "",
      stepName: rawStep,
      reportedDate: toDateInput(report.reportedDate),
      noResponse: isNoResponse,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
    setEditJobCategories([])
    setEditStepSuggestions([])
    setShowEditStepSuggestions(false)
  }

  const saveEdit = async () => {
    if (!editingId || !editForm) return

    const isNonRolling = editForm.recruitmentMode !== "ROLLING"
    const stepName = editForm.stepName.trim()
    const selectedJobCategoryId = Number(editForm.jobCategoryId)
    const rollingJobName = editForm.rollingJobName.trim()
    const selectedJobCategoryName =
      editJobCategories.find((item) => String(item.jobCategoryId) === editForm.jobCategoryId)?.jobCategoryName ?? ""
    const isOtherCategory = selectedJobCategoryName.trim() === "기타"
    const otherJobName = editForm.otherJobName.trim()

    if (isNonRolling) {
      if (!Number.isFinite(selectedJobCategoryId) || selectedJobCategoryId <= 0) {
        setMessage("직군을 선택해 주세요.")
        return
      }
      if (isOtherCategory && !otherJobName) {
        setMessage("기타 직군명을 입력해 주세요.")
        return
      }
      if (isOtherCategory && otherJobName.length > 20) {
        setMessage("기타 직군명은 20자 이내로 입력해 주세요.")
        return
      }
    } else {
      if (!rollingJobName) {
        setMessage("직업명을 입력해 주세요.")
        return
      }
      if (rollingJobName.length > 100) {
        setMessage("직업명은 100자 이내로 입력해 주세요.")
        return
      }
    }

    if (!stepName) {
      setMessage("전형명을 입력해 주세요.")
      return
    }

    if (!editForm.noResponse) {
      if (!editForm.baseDate || !editForm.reportedDate) {
        setMessage("지원/응시일과 결과 발표일을 입력해 주세요.")
        return
      }
      if (new Date(editForm.baseDate) > new Date(editForm.reportedDate)) {
        setMessage("지원/응시일이 결과 발표일보다 늦을 수 없습니다.")
        return
      }
    }

    try {
      const scope = editForm.recruitmentMode === "ROLLING" ? "rolling" : "regular"
      await updateAdminReport(editingId, {
        companyName: editForm.companyName.trim(),
        recruitmentMode: editForm.recruitmentMode,
        jobCategoryId: isNonRolling ? selectedJobCategoryId : undefined,
        rollingJobName: isNonRolling ? undefined : rollingJobName,
        otherJobName: isOtherCategory ? otherJobName : undefined,
        rollingResultType: isNonRolling
          ? undefined
          : editForm.noResponse
            ? "NO_RESPONSE_REPORTED"
            : "DATE_REPORTED",
        baseDate: editForm.noResponse ? undefined : editForm.baseDate,
        stepName: stepName,
        reportedDate: editForm.noResponse ? undefined : editForm.reportedDate,
      }, scope)
      await loadReports()
      cancelEdit()
    } catch (error) {
      console.error("Failed to update report", error)
      setMessage("수정에 실패했습니다.")
    }
  }

  const formatJobLabel = (jobCategoryName?: string | null, otherJobName?: string | null) => {
    const category = (jobCategoryName ?? "").trim()
    const other = (otherJobName ?? "").trim()
    if (category) {
      if (category === "기타" && other) return `기타 (${other})`
      return category
    }
    if (other) return `기타 (${other})`
    return "-"
  }

  const INTERVIEW_PREVIEW_LENGTH = 180

  const isInterviewExpanded = (reportId: number) => expandedInterviewReviewIds.includes(reportId)

  const toggleInterviewExpanded = (reportId: number) => {
    setExpandedInterviewReviewIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId],
    )
  }

  const buildInterviewPreview = (content?: string | null) => {
    const normalized = content?.trim() ?? ""
    if (!normalized) {
      return { text: "-", hasMore: false }
    }
    if (normalized.length <= INTERVIEW_PREVIEW_LENGTH) {
      return { text: normalized, hasMore: false }
    }
    return { text: `${normalized.slice(0, INTERVIEW_PREVIEW_LENGTH)}...`, hasMore: true }
  }

  const formatDifficultyLabel = (difficulty?: string | null) => {
    if (difficulty === "EASY") return "쉬움"
    if (difficulty === "HARD") return "어려움"
    if (difficulty === "MEDIUM") return "보통"
    return "-"
  }

  const selectedEditJobCategoryName = editForm
    ? editJobCategories.find((item) => String(item.jobCategoryId) === editForm.jobCategoryId)?.jobCategoryName ?? ""
    : ""
  const isEditingOtherCategory = selectedEditJobCategoryName.trim() === "기타"

  useEffect(() => {
    if (!editForm || editingId == null) {
      setEditStepSuggestions([])
      return
    }
    let cancelled = false
    const handle = setTimeout(async () => {
      const data = await fetchRollingReportCurrentStepNames(
        editForm.companyName,
        editForm.stepName,
        editForm.recruitmentMode,
        { jobCategoryId: editForm.jobCategoryId ? Number(editForm.jobCategoryId) : null },
      )
      if (cancelled) return
      setEditStepSuggestions(Array.from(new Set((data ?? []).filter((item) => item && item.trim()))))
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [editForm?.companyName, editForm?.stepName, editForm?.recruitmentMode, editForm?.jobCategoryId, editingId])

  return (
    <div className="page-shell [--page-max:64rem] py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          {activeScope === "rolling" ? "수시 제보 처리" : "공채/인턴 제보 처리"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          보류 상태(주황색)는 필수 데이터가 부족해 자동 처리가 불가능한 리포트입니다.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant={activeScope === "regular" ? "default" : "outline"}
            onClick={() => setActiveScope("regular")}
          >
            공채/인턴
          </Button>
          <Button
            type="button"
            variant={activeScope === "rolling" ? "default" : "outline"}
            onClick={() => setActiveScope("rolling")}
          >
            수시
          </Button>
        </div>
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
            const isRegular = report.recruitmentMode === "REGULAR"
            const isIntern = report.recruitmentMode === "INTERN"
            const isNoResponse =
              report.rollingResultType === "NO_RESPONSE_REPORTED" ||
              (!report.baseDate && !report.reportedDate)
            const stepLabel = (report.stepName ?? "").trim() || "-"
            const modeLabel = isRegular ? "공채" : isIntern ? "인턴" : "수시"
            const interviewState = buildInterviewPreview(report.interviewReviewContent)
            const expanded = isInterviewExpanded(report.reportId)
            const jobLabel = report.jobCategoryName
              ? report.jobCategoryName === "기타" && report.otherJobName?.trim()
                ? `기타 (${report.otherJobName.trim()})`
                : report.jobCategoryName
              : report.otherJobName?.trim()
                ? `기타 (${report.otherJobName.trim()})`
                : "-"

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
                    <p className="text-sm text-muted-foreground">직군: {jobLabel}</p>
                    <p className="text-sm text-muted-foreground">중복 제보: {report.reportCount}건</p>
                    <p className="text-sm text-muted-foreground">
                      지원/응시일: {report.baseDate ? toDateInput(report.baseDate) : "-"} ·
                      결과 발표일: {report.reportedDate ? toDateInput(report.reportedDate) : "-"}
                    </p>
                    <p className="text-sm mt-1">
                      전형명: {stepLabel}
                    </p>
                    <p className="text-sm mt-1">
                      면접 난이도: {formatDifficultyLabel(report.interviewDifficulty)}
                    </p>
                    <div className="mt-1">
                      <p className="text-sm text-muted-foreground">면접 후기</p>
                      <div className="mt-1 rounded-lg border border-border/60 bg-background/60 p-2 text-sm whitespace-pre-wrap break-words">
                        {expanded ? report.interviewReviewContent?.trim() || "-" : interviewState.text}
                      </div>
                      {interviewState.hasMore && (
                        <button
                          type="button"
                          onClick={() => toggleInterviewExpanded(report.reportId)}
                          className="mt-1 text-xs text-primary hover:underline"
                        >
                          {expanded ? "접기" : "더보기"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs rounded-full border px-3 py-1 text-muted-foreground">
                      {report.status}
                    </span>
                    {isOnHold && (
                      <span className="text-xs rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-700">
                        보류
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

                    {editForm.recruitmentMode === "ROLLING" ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">직업명</label>
                        <Input
                          value={editForm.rollingJobName}
                          onChange={(e) => setEditForm({ ...editForm, rollingJobName: e.target.value.slice(0, 100) })}
                          placeholder="예: 기계설비 개발"
                          className="h-10"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">직군</label>
                        <Select
                          value={editForm.jobCategoryId}
                          onValueChange={(value) => setEditForm({ ...editForm, jobCategoryId: value })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="직군 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {editJobCategories.map((item) => (
                              <SelectItem key={`edit-job-category-${item.jobCategoryId}`} value={String(item.jobCategoryId)}>
                                {item.jobCategoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {editJobCategories.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            예시 직군: {editJobCategories.slice(0, 6).map((item) => item.jobCategoryName).join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    {editForm.recruitmentMode !== "ROLLING" && isEditingOtherCategory && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">기타 직군명</label>
                        <Input
                          value={editForm.otherJobName}
                          onChange={(e) => setEditForm({ ...editForm, otherJobName: e.target.value.slice(0, 20) })}
                          placeholder="예: 데이터플랫폼"
                          className="h-10"
                        />
                      </div>
                    )}

                    {editForm.recruitmentMode !== "ROLLING" && !isEditingOtherCategory && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">기타 직군명</label>
                        <Input
                          value="-"
                          readOnly
                          disabled
                          className="h-10"
                        />
                      </div>
                    )}

                    {editForm.recruitmentMode !== "ROLLING" && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">현재 직군 표시</label>
                        <Input
                          value={formatJobLabel(selectedEditJobCategoryName, editForm.otherJobName)}
                          readOnly
                          disabled
                          className="h-10"
                        />
                      </div>
                    )}

                    <div className="md:col-span-2 flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            noResponse: !editForm.noResponse,
                            baseDate: !editForm.noResponse ? "" : editForm.baseDate,
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

                    <div className="space-y-2">
                      <label className="text-sm font-medium">전형명</label>
                      <div className="relative">
                        <Input
                          value={editForm.stepName}
                          onChange={(e) => setEditForm({ ...editForm, stepName: e.target.value })}
                          onFocus={() => setShowEditStepSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowEditStepSuggestions(false), 120)}
                          placeholder="예: 서류, 코딩테스트, 1차 면접"
                        />
                        {showEditStepSuggestions && editStepSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-border/60 bg-card p-1.5 shadow-lg">
                            <div className="max-h-48 overflow-auto">
                              {editStepSuggestions.map((stepName) => (
                                <button
                                  key={`admin-edit-step-${stepName}`}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setEditForm({ ...editForm, stepName })
                                    setShowEditStepSuggestions(false)
                                  }}
                                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/60"
                                >
                                  {stepName}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!editForm.noResponse && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">지원/응시일</label>
                          <Input
                            type="date"
                            value={editForm.baseDate}
                            onChange={(e) => setEditForm({ ...editForm, baseDate: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">결과 발표일</label>
                          <Input
                            type="date"
                            value={editForm.reportedDate}
                            onChange={(e) => setEditForm({ ...editForm, reportedDate: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      <Button type="button" onClick={saveEdit}>
                        저장
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        취소
                      </Button>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-medium">면접 난이도 (읽기 전용)</label>
                      <Input value={formatDifficultyLabel(report.interviewDifficulty)} readOnly disabled className="h-10" />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-medium">면접 후기 (읽기 전용)</label>
                      <textarea
                        value={report.interviewReviewContent?.trim() || "-"}
                        readOnly
                        className="h-[18vh] w-full resize-none rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm leading-6 text-foreground"
                      />
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


