package com.whennawa.dto.report;

import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.entity.enums.InterviewDifficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ReportCreateRequest {
    @NotBlank
    private String companyName;

    @NotNull
    private RecruitmentMode recruitmentMode;

    private LocalDate reportedDate;

    private RollingReportType rollingResultType;
    private LocalDate baseDate;
    private String stepName;
    private Long jobCategoryId;
    @Size(max = 100)
    private String rollingJobName;
    @Size(max = 20)
    private String otherJobName;
    private String notificationMessage;
    private Boolean todayAnnouncement;
    @Size(max = 5000)
    private String interviewReviewContent;
    private InterviewDifficulty interviewDifficulty;
}
