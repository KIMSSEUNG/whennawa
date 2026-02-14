package com.whennawa.dto.report;

import com.whennawa.entity.enums.RecruitmentChannelType;
import com.whennawa.entity.enums.UnitCategory;
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
    private RecruitmentChannelType channelType;

    private UnitCategory unitName;

    @NotNull
    private LocalDate reportedDate;

    private Long stepId;
    private String stepNameRaw;
}
