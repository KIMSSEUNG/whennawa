package com.whennawa.dto.company;

public class CompanyListResponse {
    private final Long companyId;
    private final String companyName;

    public CompanyListResponse(Long companyId, String companyName) {
        this.companyId = companyId;
        this.companyName = companyName;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }
}
