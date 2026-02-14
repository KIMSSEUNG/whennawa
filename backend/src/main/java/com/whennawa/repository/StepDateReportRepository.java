package com.whennawa.repository;

import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.enums.ReportStatus;
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

    long deleteByStatus(ReportStatus status);
}
