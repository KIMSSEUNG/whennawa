package com.whennawa.dto.company;

public class CompanyCreateResponse {
    private final Long companyId;
    private final String companyName;
    private final String originalCompanyName;
    private final boolean created;
    private final boolean normalizedChanged;

    public CompanyCreateResponse(Long companyId,
                                 String companyName,
                                 String originalCompanyName,
                                 boolean created,
                                 boolean normalizedChanged) {
        this.companyId = companyId;
        this.companyName = companyName;
        this.originalCompanyName = originalCompanyName;
        this.created = created;
        this.normalizedChanged = normalizedChanged;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getOriginalCompanyName() {
        return originalCompanyName;
    }

    public boolean isCreated() {
        return created;
    }

    public boolean isNormalizedChanged() {
        return normalizedChanged;
    }
}
