package com.whennawa.dto.company;

import java.time.LocalDateTime;

public class CompanySearchResponse {
    private final Long companyId;
    private final String companyName;
    private final LocalDateTime lastResultAt;

    public CompanySearchResponse(Long companyId, String companyName, LocalDateTime lastResultAt) {
        this.companyId = companyId;
        this.companyName = companyName;
        this.lastResultAt = lastResultAt;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public LocalDateTime getLastResultAt() {
        return lastResultAt;
    }
}

