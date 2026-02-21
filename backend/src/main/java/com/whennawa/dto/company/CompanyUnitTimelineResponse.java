package com.whennawa.dto.company;

import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class CompanyUnitTimelineResponse {
    private final int year;
    private final List<CompanyTimelineStep> steps;
}
