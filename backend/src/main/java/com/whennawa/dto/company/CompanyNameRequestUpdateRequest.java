package com.whennawa.dto.company;

import jakarta.validation.constraints.NotBlank;

public class CompanyNameRequestUpdateRequest {
    @NotBlank
    private String companyName;

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }
}
