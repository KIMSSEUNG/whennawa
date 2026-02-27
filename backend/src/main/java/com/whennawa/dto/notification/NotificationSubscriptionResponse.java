package com.whennawa.dto.notification;

import java.time.LocalDateTime;

public class NotificationSubscriptionResponse {
    private final Long subscriptionId;
    private final Long companyId;
    private final String companyName;
    private final LocalDateTime createdAt;

    public NotificationSubscriptionResponse(Long subscriptionId, Long companyId, String companyName, LocalDateTime createdAt) {
        this.subscriptionId = subscriptionId;
        this.companyId = companyId;
        this.companyName = companyName;
        this.createdAt = createdAt;
    }

    public Long getSubscriptionId() {
        return subscriptionId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
