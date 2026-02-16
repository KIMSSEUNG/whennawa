package com.whennawa.dto.report;

import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RecruitmentChannelType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.UnitCategory;
import java.time.LocalDate;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class ReportAdminItem {
    private final Long reportId;
    private final Integer reportCount;
    private final String companyName;
    private final RecruitmentMode recruitmentMode;
    private final RecruitmentChannelType channelType;
    private final UnitCategory unitName;
    private final LocalDate prevReportedDate;
    private final String currentStepName;
    private final LocalDate reportedDate;
    private final Long stepId;
    private final String stepName;
    private final String stepNameRaw;
    private final ReportStatus status;
    private final boolean onHold;
}
