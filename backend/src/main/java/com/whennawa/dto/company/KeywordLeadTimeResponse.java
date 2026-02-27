package com.whennawa.dto.company;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class KeywordLeadTimeResponse {
    private final String keyword;
    private final Long medianDays;
    private final Long minDays;
    private final Long maxDays;
}
