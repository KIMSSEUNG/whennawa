package com.whennawa.dto.home;

import com.whennawa.entity.enums.RecruitmentMode;
import java.time.LocalDateTime;

public class HomeLatestReportItem {
    private final String companyName;
    private final String stepName;
    private final RecruitmentMode recruitmentMode;
    private final LocalDateTime updatedAt;

    public HomeLatestReportItem(String companyName,
                                String stepName,
                                RecruitmentMode recruitmentMode,
                                LocalDateTime updatedAt) {
        this.companyName = companyName;
        this.stepName = stepName;
        this.recruitmentMode = recruitmentMode;
        this.updatedAt = updatedAt;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getStepName() {
        return stepName;
    }

    public RecruitmentMode getRecruitmentMode() {
        return recruitmentMode;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
