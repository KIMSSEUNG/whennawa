package com.whennawa.controller;

import com.whennawa.dto.report.ReportAdminItem;
import com.whennawa.dto.report.ReportAssignBatchResponse;
import com.whennawa.dto.report.JobCategoryCreateRequest;
import com.whennawa.dto.report.JobCategoryItem;
import com.whennawa.dto.report.ReportJobMergeRequest;
import com.whennawa.dto.report.ReportStepResponse;
import com.whennawa.dto.report.ReportUpdateRequest;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.security.UserPrincipal;
import com.whennawa.service.ReportService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {
    private final ReportService reportService;

    @GetMapping("/regular")
    public List<ReportAdminItem> listRegular(Authentication authentication,
                                             @RequestParam(value = "status", required = false) ReportStatus status) {
        ensureAuthenticated(authentication);
        return reportService.findAdminRegularReports(status);
    }

    @GetMapping("/rolling")
    public List<ReportAdminItem> listRolling(Authentication authentication,
                                             @RequestParam(value = "status", required = false) ReportStatus status) {
        ensureAuthenticated(authentication);
        return reportService.findAdminRollingReports(status);
    }

    @GetMapping
    public List<ReportAdminItem> list(Authentication authentication,
                                      @RequestParam(value = "status", required = false) ReportStatus status) {
        ensureAuthenticated(authentication);
        return reportService.findAdminRegularReports(status);
    }

    @GetMapping("/regular/{reportId}/steps")
    public List<ReportStepResponse> regularSteps(Authentication authentication,
                                                 @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.findRegularStepsForReport(reportId);
    }

    @GetMapping("/{reportId}/steps")
    public List<ReportStepResponse> steps(Authentication authentication,
                                          @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.findRegularStepsForReport(reportId);
    }

    @PatchMapping("/regular/{reportId}")
    public ReportAdminItem updateRegular(Authentication authentication,
                                         @PathVariable("reportId") Long reportId,
                                         @Valid @RequestBody ReportUpdateRequest request) {
        ensureAuthenticated(authentication);
        return reportService.updateRegularReport(reportId, request);
    }

    @PatchMapping("/rolling/{reportId}")
    public ReportAdminItem updateRolling(Authentication authentication,
                                         @PathVariable("reportId") Long reportId,
                                         @Valid @RequestBody ReportUpdateRequest request) {
        ensureAuthenticated(authentication);
        return reportService.updateRollingReport(reportId, request);
    }

    @PostMapping("/regular/{reportId}/process")
    public ReportAdminItem processRegular(Authentication authentication,
                                          @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.processRegularReport(reportId);
    }

    @PostMapping("/rolling/{reportId}/process")
    public ReportAdminItem processRolling(Authentication authentication,
                                          @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.processRollingReport(reportId);
    }

    @PostMapping("/regular/{reportId}/assign")
    public ReportAdminItem assignRegular(Authentication authentication,
                                         @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.assignRegularReportValues(reportId);
    }

    @PostMapping("/rolling/{reportId}/assign")
    public ReportAdminItem assignRolling(Authentication authentication,
                                         @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.assignRollingReportValues(reportId);
    }

    @PostMapping("/regular/assign-pending")
    public ReportAssignBatchResponse assignRegularPending(Authentication authentication) {
        ensureAuthenticated(authentication);
        int updatedCount = reportService.assignAllPendingRegularReports();
        return new ReportAssignBatchResponse(updatedCount);
    }

    @PostMapping("/rolling/assign-pending")
    public ReportAssignBatchResponse assignRollingPending(Authentication authentication) {
        ensureAuthenticated(authentication);
        int updatedCount = reportService.assignAllPendingRollingReports();
        return new ReportAssignBatchResponse(updatedCount);
    }

    @PostMapping("/regular/{reportId}/discard")
    @ResponseStatus(HttpStatus.OK)
    public ReportAdminItem discardRegular(Authentication authentication,
                                          @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.discardRegularReport(reportId);
    }

    @PostMapping("/rolling/{reportId}/discard")
    @ResponseStatus(HttpStatus.OK)
    public ReportAdminItem discardRolling(Authentication authentication,
                                          @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.discardRollingReport(reportId);
    }

    @PostMapping("/regular/{reportId}/job-review/approve")
    public ReportAdminItem approveRegularJobReview(Authentication authentication,
                                                   @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.approveRegularJobReview(reportId);
    }

    @PostMapping("/rolling/{reportId}/job-review/approve")
    public ReportAdminItem approveRollingJobReview(Authentication authentication,
                                                   @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.approveRollingJobReview(reportId);
    }

    @PostMapping("/regular/{reportId}/job-review/reject")
    public ReportAdminItem rejectRegularJobReview(Authentication authentication,
                                                  @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.rejectRegularJobReview(reportId);
    }

    @PostMapping("/rolling/{reportId}/job-review/reject")
    public ReportAdminItem rejectRollingJobReview(Authentication authentication,
                                                  @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.rejectRollingJobReview(reportId);
    }

    @PostMapping("/regular/{reportId}/job-merge")
    public ReportAdminItem mergeRegularOtherJob(Authentication authentication,
                                                @PathVariable("reportId") Long reportId,
                                                @Valid @RequestBody ReportJobMergeRequest request) {
        ensureAuthenticated(authentication);
        return reportService.mergeRegularOtherJobCategory(reportId, request.getTargetJobCategoryId(), request.getDecision());
    }

    @PostMapping("/rolling/{reportId}/job-merge")
    public ReportAdminItem mergeRollingOtherJob(Authentication authentication,
                                                @PathVariable("reportId") Long reportId,
                                                @Valid @RequestBody ReportJobMergeRequest request) {
        ensureAuthenticated(authentication);
        return reportService.mergeRollingOtherJobCategory(reportId, request.getTargetJobCategoryId(), request.getDecision());
    }

    @PatchMapping("/{reportId}")
    public ReportAdminItem update(Authentication authentication,
                                  @PathVariable("reportId") Long reportId,
                                  @Valid @RequestBody ReportUpdateRequest request) {
        ensureAuthenticated(authentication);
        return reportService.updateRegularReport(reportId, request);
    }

    @PostMapping("/{reportId}/process")
    public ReportAdminItem process(Authentication authentication,
                                   @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.processRegularReport(reportId);
    }

    @PostMapping("/{reportId}/assign")
    public ReportAdminItem assign(Authentication authentication,
                                  @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.assignRegularReportValues(reportId);
    }

    @PostMapping("/assign-pending")
    public ReportAssignBatchResponse assignPending(Authentication authentication) {
        ensureAuthenticated(authentication);
        int updatedCount = reportService.assignAllPendingRegularReports();
        return new ReportAssignBatchResponse(updatedCount);
    }

    @PostMapping("/{reportId}/discard")
    @ResponseStatus(HttpStatus.OK)
    public ReportAdminItem discard(Authentication authentication,
                                   @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.discardRegularReport(reportId);
    }

    @PostMapping("/{reportId}/job-review/approve")
    public ReportAdminItem approveJobReview(Authentication authentication,
                                            @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.approveRegularJobReview(reportId);
    }

    @PostMapping("/{reportId}/job-review/reject")
    public ReportAdminItem rejectJobReview(Authentication authentication,
                                           @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.rejectRegularJobReview(reportId);
    }

    @PostMapping("/{reportId}/job-merge")
    public ReportAdminItem mergeOtherJob(Authentication authentication,
                                         @PathVariable("reportId") Long reportId,
                                         @Valid @RequestBody ReportJobMergeRequest request) {
        ensureAuthenticated(authentication);
        return reportService.mergeRegularOtherJobCategory(reportId, request.getTargetJobCategoryId(), request.getDecision());
    }

    @PostMapping("/job-categories")
    @ResponseStatus(HttpStatus.CREATED)
    public JobCategoryItem createJobCategory(Authentication authentication,
                                             @Valid @RequestBody JobCategoryCreateRequest request) {
        ensureAuthenticated(authentication);
        return reportService.createJobCategory(request.getName());
    }

    private void ensureAuthenticated(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
    }
}
