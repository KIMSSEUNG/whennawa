package com.whennawa.dto.home;

import java.time.LocalDateTime;

public class HomeHotCompanyItem {
    private final Long companyId;
    private final String companyName;
    private final String latestStepName;
    private final Integer activityCount;
    private final LocalDateTime updatedAt;

    public HomeHotCompanyItem(Long companyId,
                              String companyName,
                              String latestStepName,
                              Integer activityCount,
                              LocalDateTime updatedAt) {
        this.companyId = companyId;
        this.companyName = companyName;
        this.latestStepName = latestStepName;
        this.activityCount = activityCount;
        this.updatedAt = updatedAt;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getLatestStepName() {
        return latestStepName;
    }

    public Integer getActivityCount() {
        return activityCount;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
