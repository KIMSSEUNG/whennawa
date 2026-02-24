package com.whennawa.repository;

import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.entity.enums.RecruitmentMode;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StepDateReportRepository extends JpaRepository<StepDateReport, Long> {
    List<StepDateReport> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(ReportStatus status);
    List<StepDateReport> findAllByDeletedAtIsNullOrderByCreatedAtDesc();

    Optional<StepDateReport> findByReportIdAndDeletedAtIsNull(Long reportId);

    Optional<StepDateReport> findFirstByCompanyNameAndReportedDateAndPrevStepNameAndCurrentStepNameAndStatusAndDeletedAtIsNull(
        String companyName,
        java.time.LocalDate reportedDate,
        String prevStepName,
        String currentStepName,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndPrevStepNameAndCurrentStepNameAndPrevReportedDateAndReportedDateAndStatusAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        RollingReportType rollingResultType,
        String prevStepName,
        String currentStepName,
        java.time.LocalDate prevReportedDate,
        java.time.LocalDate reportedDate,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndPrevStepNameAndCurrentStepNameAndStatusAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        RollingReportType rollingResultType,
        String prevStepName,
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
