package com.whennawa.repository;

import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.UnitCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StepDateReportRepository extends JpaRepository<StepDateReport, Long> {
    List<StepDateReport> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(ReportStatus status);
    List<StepDateReport> findAllByDeletedAtIsNullOrderByCreatedAtDesc();

    Optional<StepDateReport> findByReportIdAndDeletedAtIsNull(Long reportId);

    Optional<StepDateReport> findFirstByCompanyNameAndUnitNameAndChannelTypeAndReportedDateAndStepStepIdAndStatusAndDeletedAtIsNull(
        String companyName,
        UnitCategory unitName,
        com.whennawa.entity.enums.RecruitmentChannelType channelType,
        java.time.LocalDate reportedDate,
        Long stepId,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndUnitNameAndChannelTypeAndReportedDateAndStepIsNullAndStepNameRawAndStatusAndDeletedAtIsNull(
        String companyName,
        UnitCategory unitName,
        com.whennawa.entity.enums.RecruitmentChannelType channelType,
        java.time.LocalDate reportedDate,
        String stepNameRaw,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndCurrentStepNameAndPrevReportedDateAndReportedDateAndStatusAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        RollingReportType rollingResultType,
        String currentStepName,
        java.time.LocalDate prevReportedDate,
        java.time.LocalDate reportedDate,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndCurrentStepNameAndStatusAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        RollingReportType rollingResultType,
        String currentStepName,
        ReportStatus status
    );

    List<StepDateReport> findByCompanyNameIgnoreCaseAndRecruitmentModeAndStatusAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        ReportStatus status
    );

    long deleteByStatus(ReportStatus status);
    long deleteByStatusIn(List<ReportStatus> statuses);
}
