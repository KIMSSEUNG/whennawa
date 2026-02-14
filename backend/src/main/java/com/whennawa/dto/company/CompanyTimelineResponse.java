package com.whennawa.dto.company;

public class CompanyTimelineResponse {
    private final Long companyId;
    private final String companyName;
    private final java.util.List<CompanyUnitTimelineResponse> timelines;

    public CompanyTimelineResponse(Long companyId, String companyName, java.util.List<CompanyUnitTimelineResponse> timelines) {
        this.companyId = companyId;
        this.companyName = companyName;
        this.timelines = timelines;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public java.util.List<CompanyUnitTimelineResponse> getTimelines() {
        return timelines;
    }
}

