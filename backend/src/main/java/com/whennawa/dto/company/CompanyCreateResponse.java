package com.whennawa.dto.company;

public class CompanyCreateResponse {
    private final Long companyId;
    private final Long requestId;
    private final String companyName;
    private final String originalCompanyName;
    private final boolean created;
    private final boolean pending;
    private final boolean normalizedChanged;
    private final String message;

    public CompanyCreateResponse(Long companyId,
                                 Long requestId,
                                 String companyName,
                                 String originalCompanyName,
                                 boolean created,
                                 boolean pending,
                                 boolean normalizedChanged,
                                 String message) {
        this.companyId = companyId;
        this.requestId = requestId;
        this.companyName = companyName;
        this.originalCompanyName = originalCompanyName;
        this.created = created;
        this.pending = pending;
        this.normalizedChanged = normalizedChanged;
        this.message = message;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public Long getRequestId() {
        return requestId;
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

    public boolean isPending() {
        return pending;
    }

    public boolean isNormalizedChanged() {
        return normalizedChanged;
    }

    public String getMessage() {
        return message;
    }
}
