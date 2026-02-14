package com.whennawa.dto.company;

import com.whennawa.entity.enums.RecruitmentChannelType;
import com.whennawa.entity.enums.UnitCategory;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class CompanyUnitTimelineResponse {
    private final UnitCategory unitName;
    private final RecruitmentChannelType channelType;
    private final int year;
    private final List<CompanyTimelineStep> steps;
}
