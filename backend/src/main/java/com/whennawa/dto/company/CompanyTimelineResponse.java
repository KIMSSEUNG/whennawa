package com.whennawa.dto.company;

public class CompanyTimelineResponse {
    private final Long companyId;
    private final String companyName;
    private final java.util.List<CompanyUnitTimelineResponse> regularTimelines;
    private final java.util.List<RollingStepStatsResponse> rollingSteps;

    public CompanyTimelineResponse(Long companyId,
                                   String companyName,
                                   java.util.List<CompanyUnitTimelineResponse> regularTimelines,
                                   java.util.List<RollingStepStatsResponse> rollingSteps) {
        this.companyId = companyId;
        this.companyName = companyName;
        this.regularTimelines = regularTimelines;
        this.rollingSteps = rollingSteps;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public java.util.List<CompanyUnitTimelineResponse> getRegularTimelines() {
        return regularTimelines;
    }

    public java.util.List<CompanyUnitTimelineResponse> getTimelines() {
        return regularTimelines;
    }

    public java.util.List<RollingStepStatsResponse> getRollingSteps() {
        return rollingSteps;
    }
}

