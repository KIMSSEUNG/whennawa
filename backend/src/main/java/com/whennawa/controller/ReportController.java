package com.whennawa.controller;

import com.whennawa.dto.report.ReportCreateRequest;
import com.whennawa.dto.report.ReportCreateResponse;
import com.whennawa.dto.report.ReportStepResponse;
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
    public List<ReportStepResponse> steps(@RequestParam("companyName") String companyName) {
        return reportService.findStepsForCompany(companyName);
    }

    @GetMapping("/rolling-steps")
    public List<String> rollingSteps(@RequestParam(value = "companyName", required = false) String companyName,
                                     @RequestParam(value = "q", required = false) String query) {
        return reportService.findRollingStepNameSuggestions(companyName, query);
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
