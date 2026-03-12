package com.whennawa.dto.report;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportJobMergeRequest {
    @NotNull
    private Long targetJobCategoryId;

    private MergeDecision decision = MergeDecision.NONE;

    public enum MergeDecision {
        NONE,
        PROCESS,
        DISCARD
    }
}
