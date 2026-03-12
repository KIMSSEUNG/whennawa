package com.whennawa.controller;

import com.whennawa.dto.report.ReportCreateRequest;
import com.whennawa.dto.report.ReportCreateResponse;
import com.whennawa.dto.report.CategoryJobItem;
import com.whennawa.dto.report.JobCategoryItem;
import com.whennawa.dto.report.ReportStepResponse;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.service.ReportService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.whennawa.security.UserPrincipal;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportCreateResponse create(@Valid @RequestBody ReportCreateRequest request,
                                       HttpServletRequest httpRequest,
                                       Authentication authentication) {
        String clientIp = resolveClientIp(httpRequest);
        Long reporterUserId = extractUserId(authentication);
        return reportService.createReport(request, clientIp, reporterUserId);
    }

    @GetMapping("/steps")
    public List<ReportStepResponse> steps(@RequestParam("companyName") String companyName,
                                          @RequestParam(value = "jobCategoryId", required = false) Long jobCategoryId) {
        return reportService.findStepsForCompany(companyName, jobCategoryId);
    }

    @GetMapping("/rolling-steps")
    public List<String> rollingSteps(@RequestParam(value = "companyName", required = false) String companyName,
                                     @RequestParam(value = "q", required = false) String query,
                                     @RequestParam(value = "mode", required = false) RecruitmentMode mode,
                                     @RequestParam(value = "jobCategoryId", required = false) Long jobCategoryId,
                                     @RequestParam(value = "kind", required = false) String kind) {
        return reportService.findRollingStepNameSuggestions(companyName, query, mode, jobCategoryId, kind);
    }

    @GetMapping("/rolling-step-pair")
    public String rollingStepPair(@RequestParam(value = "companyName", required = false) String companyName,
                                  @RequestParam(value = "jobCategoryId", required = false) Long jobCategoryId,
                                  @RequestParam("direction") String direction,
                                  @RequestParam("stepName") String stepName) {
        return reportService.resolveRollingStepPair(companyName, jobCategoryId, direction, stepName);
    }

    @GetMapping("/job-categories")
    public List<JobCategoryItem> jobCategories() {
        return reportService.findActiveJobCategories();
    }

    @GetMapping("/category-jobs")
    public List<CategoryJobItem> categoryJobs(@RequestParam("companyName") String companyName) {
        return reportService.findCategoryJobs(companyName);
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private Long extractUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            return null;
        }
        return principal.getUserId();
    }
}
