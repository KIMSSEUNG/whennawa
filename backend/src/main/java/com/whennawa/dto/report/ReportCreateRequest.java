package com.whennawa.dto.report;

import com.whennawa.entity.enums.RecruitmentChannelType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.UnitCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ReportCreateRequest {
    @NotBlank
    private String companyName;

    @NotNull
    private RecruitmentMode recruitmentMode;

    private RecruitmentChannelType channelType;

    private UnitCategory unitName;

    @NotNull
    private LocalDate reportedDate;

    private LocalDate prevReportedDate;
    private String currentStepName;

    private Long stepId;
    private String stepNameRaw;
}
