package com.whennawa.dto.report;

import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.RollingReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ReportUpdateRequest {
    @NotBlank
    private String companyName;

    @NotNull
    private RecruitmentMode recruitmentMode;

    private LocalDate reportedDate;

    private RollingReportType rollingResultType;
    private LocalDate prevReportedDate;
    private String prevStepName;
    private String currentStepName;

    private Long stepId;
}
