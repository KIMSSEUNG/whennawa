package com.whennawa.dto.company;

import com.whennawa.dto.interview.InterviewReviewItem;

public class CompanyStatusResponse {
    private final Long companyId;
    private final String companyName;
    private final java.util.List<CompanyYearlyStatusResponse> regularTimelines;
    private final java.util.List<CompanyYearlyStatusResponse> internTimelines;
    private final java.util.List<RollingStepStatsResponse> rollingSteps;
    private final java.util.List<InterviewReviewItem> interviewReviews;

    public CompanyStatusResponse(Long companyId,
                                 String companyName,
                                 java.util.List<CompanyYearlyStatusResponse> regularTimelines,
                                 java.util.List<CompanyYearlyStatusResponse> internTimelines,
                                 java.util.List<RollingStepStatsResponse> rollingSteps,
                                 java.util.List<InterviewReviewItem> interviewReviews) {
        this.companyId = companyId;
        this.companyName = companyName;
        this.regularTimelines = regularTimelines;
        this.internTimelines = internTimelines;
        this.rollingSteps = rollingSteps;
        this.interviewReviews = interviewReviews;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public java.util.List<CompanyYearlyStatusResponse> getRegularTimelines() {
        return regularTimelines;
    }

    public java.util.List<CompanyYearlyStatusResponse> getRegularReports() {
        return regularTimelines;
    }

    public java.util.List<CompanyYearlyStatusResponse> getTimelines() {
        return regularTimelines;
    }

    public java.util.List<CompanyYearlyStatusResponse> getInternTimelines() {
        return internTimelines;
    }

    public java.util.List<CompanyYearlyStatusResponse> getInternReports() {
        return internTimelines;
    }

    public java.util.List<RollingStepStatsResponse> getRollingSteps() {
        return rollingSteps;
    }

    public java.util.List<RollingStepStatsResponse> getRollingReports() {
        return rollingSteps;
    }

    public java.util.List<InterviewReviewItem> getInterviewReviews() {
        return interviewReviews;
    }
}
