package com.whennawa.controller;

import com.whennawa.dto.report.ReportAdminItem;
import com.whennawa.dto.report.ReportAssignBatchResponse;
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

    @GetMapping
    public List<ReportAdminItem> list(Authentication authentication,
                                      @RequestParam(value = "status", required = false) ReportStatus status) {
        ensureAuthenticated(authentication);
        return reportService.findAdminReports(status);
    }

    @GetMapping("/{reportId}/steps")
    public List<ReportStepResponse> steps(Authentication authentication,
                                          @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.findStepsForReport(reportId);
    }

    @PatchMapping("/{reportId}")
    public ReportAdminItem update(Authentication authentication,
                                  @PathVariable("reportId") Long reportId,
                                  @Valid @RequestBody ReportUpdateRequest request) {
        ensureAuthenticated(authentication);
        return reportService.updateReport(reportId, request);
    }

    @PostMapping("/{reportId}/process")
    public ReportAdminItem process(Authentication authentication,
                                   @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.processReport(reportId);
    }

    @PostMapping("/{reportId}/assign")
    public ReportAdminItem assign(Authentication authentication,
                                  @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.assignReportValues(reportId);
    }

    @PostMapping("/assign-pending")
    public ReportAssignBatchResponse assignPending(Authentication authentication) {
        ensureAuthenticated(authentication);
        int updatedCount = reportService.assignAllPendingReports();
        return new ReportAssignBatchResponse(updatedCount);
    }

    @PostMapping("/{reportId}/discard")
    @ResponseStatus(HttpStatus.OK)
    public ReportAdminItem discard(Authentication authentication,
                                   @PathVariable("reportId") Long reportId) {
        ensureAuthenticated(authentication);
        return reportService.discardReport(reportId);
    }

    private void ensureAuthenticated(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
    }
}
