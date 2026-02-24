package com.whennawa.controller;

import com.whennawa.dto.company.CompanySearchResponse;
import com.whennawa.dto.company.CompanyTimelineResponse;
import com.whennawa.dto.company.CompanyCreateRequest;
import com.whennawa.dto.company.CompanyCreateResponse;
import com.whennawa.dto.company.KeywordLeadTimeResponse;
import com.whennawa.dto.company.RollingPredictionResponse;
import com.whennawa.service.CompanySearchService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies")
public class CompanySearchController {
    private final CompanySearchService companySearchService;

    public CompanySearchController(CompanySearchService companySearchService) {
        this.companySearchService = companySearchService;
    }

    @GetMapping("/search")
    public List<CompanySearchResponse> searchCompanies(@RequestParam("query") String query,
                                                       @RequestParam(value = "limit", required = false) Integer limit) {
        return companySearchService.searchCompanies(query, limit);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyCreateResponse createCompany(@Valid @RequestBody CompanyCreateRequest request) {
        return companySearchService.createCompany(request.getCompanyName());
    }

    @GetMapping("/{companyName}/timeline")
    public CompanyTimelineResponse timeline(@PathVariable("companyName") String companyName) {
        return companySearchService.getRepresentativeTimeline(companyName);
    }

    @GetMapping("/{companyName}/lead-time")
    public KeywordLeadTimeResponse leadTime(@PathVariable("companyName") String companyName,
                                            @RequestParam("q") String keyword) {
        return companySearchService.getKeywordLeadTime(companyName, keyword);
    }

    @GetMapping("/{companyName}/rolling-predict")
    public RollingPredictionResponse rollingPredict(@PathVariable("companyName") String companyName,
                                                    @RequestParam("stepName") String stepName,
                                                    @RequestParam("prevDate") LocalDate prevDate) {
        return companySearchService.predictRollingResult(companyName, stepName, prevDate);
    }
}

