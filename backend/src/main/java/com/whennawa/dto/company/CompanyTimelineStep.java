package com.whennawa.dto.company;

import java.time.LocalDateTime;

public class CompanyTimelineStep {
    private final String eventType;
    private final String label;
    private final LocalDateTime occurredAt;
    private final Long diffDays;
    private final Integer prevStepId;

    public CompanyTimelineStep(String eventType, String label, LocalDateTime occurredAt, Long diffDays, Integer prevStepId) {
        this.eventType = eventType;
        this.label = label;
        this.occurredAt = occurredAt;
        this.diffDays = diffDays;
        this.prevStepId = prevStepId;
    }

    public String getEventType() {
        return eventType;
    }

    public String getLabel() {
        return label;
    }

    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    public Long getDiffDays() {
        return diffDays;
    }

    public Integer getPrevStepId() {
        return prevStepId;
    }
}

