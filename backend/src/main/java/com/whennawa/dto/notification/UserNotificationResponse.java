package com.whennawa.dto.notification;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class UserNotificationResponse {
    private final Long notificationId;
    private final Long companyId;
    private final String companyName;
    private final LocalDate eventDate;
    private final String firstReporterNickname;
    private final String reporterMessage;
    private final Integer reporterCount;
    private final String summaryText;
    private final boolean read;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public UserNotificationResponse(Long notificationId,
                                    Long companyId,
                                    String companyName,
                                    LocalDate eventDate,
                                    String firstReporterNickname,
                                    String reporterMessage,
                                    Integer reporterCount,
                                    String summaryText,
                                    boolean read,
                                    LocalDateTime createdAt,
                                    LocalDateTime updatedAt) {
        this.notificationId = notificationId;
        this.companyId = companyId;
        this.companyName = companyName;
        this.eventDate = eventDate;
        this.firstReporterNickname = firstReporterNickname;
        this.reporterMessage = reporterMessage;
        this.reporterCount = reporterCount;
        this.summaryText = summaryText;
        this.read = read;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getNotificationId() {
        return notificationId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public LocalDate getEventDate() {
        return eventDate;
    }

    public String getFirstReporterNickname() {
        return firstReporterNickname;
    }

    public String getReporterMessage() {
        return reporterMessage;
    }

    public Integer getReporterCount() {
        return reporterCount;
    }

    public String getSummaryText() {
        return summaryText;
    }

    public boolean isRead() {
        return read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
