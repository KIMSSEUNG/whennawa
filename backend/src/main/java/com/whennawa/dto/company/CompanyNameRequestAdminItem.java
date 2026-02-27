package com.whennawa.dto.company;

import com.whennawa.entity.enums.CompanyRequestStatus;
import java.time.LocalDateTime;

public class CompanyNameRequestAdminItem {
    private final Long requestId;
    private final String originalCompanyName;
    private final String normalizedCompanyName;
    private final Integer requestCount;
    private final CompanyRequestStatus status;
    private final boolean alreadyExists;
    private final String existingCompanyName;
    private final String message;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public CompanyNameRequestAdminItem(Long requestId,
                                       String originalCompanyName,
                                       String normalizedCompanyName,
                                       Integer requestCount,
                                       CompanyRequestStatus status,
                                       boolean alreadyExists,
                                       String existingCompanyName,
                                       String message,
                                       LocalDateTime createdAt,
                                       LocalDateTime updatedAt) {
        this.requestId = requestId;
        this.originalCompanyName = originalCompanyName;
        this.normalizedCompanyName = normalizedCompanyName;
        this.requestCount = requestCount;
        this.status = status;
        this.alreadyExists = alreadyExists;
        this.existingCompanyName = existingCompanyName;
        this.message = message;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getRequestId() {
        return requestId;
    }

    public String getOriginalCompanyName() {
        return originalCompanyName;
    }

    public String getNormalizedCompanyName() {
        return normalizedCompanyName;
    }

    public Integer getRequestCount() {
        return requestCount;
    }

    public CompanyRequestStatus getStatus() {
        return status;
    }

    public boolean isAlreadyExists() {
        return alreadyExists;
    }

    public String getExistingCompanyName() {
        return existingCompanyName;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
