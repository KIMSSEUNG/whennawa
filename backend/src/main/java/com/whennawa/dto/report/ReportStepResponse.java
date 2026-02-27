package com.whennawa.dto.report;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class ReportStepResponse {
    private final Long stepId;
    private final String stepName;
}
