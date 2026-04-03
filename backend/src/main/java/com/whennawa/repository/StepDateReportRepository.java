package com.whennawa.repository;

import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.entity.enums.RecruitmentMode;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StepDateReportRepository extends JpaRepository<StepDateReport, Long> {
    List<StepDateReport> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(ReportStatus status);
    List<StepDateReport> findAllByDeletedAtIsNullOrderByCreatedAtDesc();

    Optional<StepDateReport> findByReportIdAndDeletedAtIsNull(Long reportId);

    List<StepDateReport> findByCompanyAndOtherJobNameAndStatusAndDeletedAtIsNull(
        com.whennawa.entity.Company company,
        String otherJobName,
        ReportStatus status
    );

    List<StepDateReport> findByCompanyAndStatusAndDeletedAtIsNull(
        com.whennawa.entity.Company company,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndReportedDateAndStepNameAndStatusAndDeletedAtIsNull(
        String companyName,
        java.time.LocalDate reportedDate,
        String stepName,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndStepNameAndBaseDateAndReportedDateAndStatusAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        RollingReportType rollingResultType,
        String stepName,
        java.time.LocalDate baseDate,
        java.time.LocalDate reportedDate,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndStepNameAndBaseDateAndReportedDateAndStatusAndJobCategoryAndOtherJobNameAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        RollingReportType rollingResultType,
        String stepName,
        java.time.LocalDate baseDate,
        java.time.LocalDate reportedDate,
        ReportStatus status,
        com.whennawa.entity.JobCategory jobCategory,
        String otherJobName
    );

    Optional<StepDateReport> findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndStepNameAndStatusAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        RollingReportType rollingResultType,
        String stepName,
        ReportStatus status
    );

    Optional<StepDateReport> findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndStepNameAndStatusAndJobCategoryAndOtherJobNameAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        RollingReportType rollingResultType,
        String stepName,
        ReportStatus status,
        com.whennawa.entity.JobCategory jobCategory,
        String otherJobName
    );

    List<StepDateReport> findByCompanyNameIgnoreCaseAndRecruitmentModeAndStatusAndDeletedAtIsNull(
        String companyName,
        RecruitmentMode recruitmentMode,
        ReportStatus status
    );

    long deleteByStatus(ReportStatus status);
    long deleteByStatusIn(List<ReportStatus> statuses);

    @Modifying
    @Query("""
        delete from StepDateReport r
        where r.status in :statuses
          and not exists (
            select 1
            from InterviewReview ir
            where ir.report = r
          )
        """)
    long deleteByStatusInWithoutInterviewReviews(@Param("statuses") List<ReportStatus> statuses);
}
