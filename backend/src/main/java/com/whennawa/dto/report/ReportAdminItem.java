package com.whennawa.dto.report;

import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.JobReviewStatus;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.InterviewDifficulty;
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
    private final RollingReportType rollingResultType;
    private final LocalDate prevReportedDate;
    private final String prevStepName;
    private final String currentStepName;
    private final LocalDate reportedDate;
    private final ReportStatus status;
    private final Long jobCategoryId;
    private final String jobCategoryName;
    private final String otherJobName;
    private final JobReviewStatus jobReviewStatus;
    private final String interviewReviewContent;
    private final InterviewDifficulty interviewDifficulty;
    private final boolean onHold;
}
