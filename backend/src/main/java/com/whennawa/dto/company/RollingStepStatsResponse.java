package com.whennawa.dto.company;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class RollingStepStatsResponse {
    private final String stepName;
    private final long sampleCount;
    private final long noResponseCount;
    private final Long avgDays;
    private final Long minDays;
    private final Long maxDays;
}
