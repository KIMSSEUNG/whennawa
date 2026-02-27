package com.whennawa.dto.company;

import java.time.LocalDateTime;

public class CompanySearchResponse {
    private final String companyName;
    private final LocalDateTime lastResultAt;

    public CompanySearchResponse(String companyName, LocalDateTime lastResultAt) {
        this.companyName = companyName;
        this.lastResultAt = lastResultAt;
    }

    public String getCompanyName() {
        return companyName;
    }

    public LocalDateTime getLastResultAt() {
        return lastResultAt;
    }
}

