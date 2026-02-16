package com.whennawa.controller;

import com.whennawa.dto.report.ReportCreateRequest;
import com.whennawa.dto.report.ReportCreateResponse;
import com.whennawa.dto.report.ReportStepResponse;
import com.whennawa.entity.enums.RecruitmentChannelType;
import com.whennawa.entity.enums.UnitCategory;
import com.whennawa.service.ReportService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportCreateResponse create(@Valid @RequestBody ReportCreateRequest request,
                                       HttpServletRequest httpRequest) {
        String clientIp = resolveClientIp(httpRequest);
        return reportService.createReport(request, clientIp);
    }

    @GetMapping("/steps")
    public List<ReportStepResponse> steps(@RequestParam("companyName") String companyName,
                                          @RequestParam("channelType") RecruitmentChannelType channelType,
                                          @RequestParam(value = "unitName", required = false) String unitName) {
        UnitCategory category = null;
        if (unitName != null && !unitName.isBlank()) {
            category = UnitCategory.fromUnitName(unitName);
            if (category == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid unit category");
            }
        }
        return reportService.findStepsForCompany(companyName, channelType, category);
    }

    @GetMapping("/rolling-steps")
    public List<String> rollingSteps(@RequestParam("companyName") String companyName,
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
}
