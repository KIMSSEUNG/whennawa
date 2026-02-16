package com.whennawa.dto.company;

import java.time.LocalDate;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class RollingPredictionResponse {
    private final String stepName;
    private final LocalDate previousStepDate;
    private final long sampleCount;
    private final LocalDate expectedDate;
    private final LocalDate expectedStartDate;
    private final LocalDate expectedEndDate;
}
