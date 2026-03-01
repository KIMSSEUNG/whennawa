package com.whennawa.repository;

import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.enums.LogSourceType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.RollingReportType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RollingStepLogRepository extends JpaRepository<RollingStepLog, Long> {
    List<RollingStepLog> findByCompanyNameIgnoreCase(String companyName);
    List<RollingStepLog> findByCompanyNameIgnoreCaseAndRecruitmentMode(String companyName, RecruitmentMode recruitmentMode);

    @Query("""
        select log.currentStepName
        from RollingStepLog log
        where log.currentStepName is not null
          and log.recruitmentMode = :recruitmentMode
          and trim(log.currentStepName) <> ''
        group by log.currentStepName
        order by sum(coalesce(log.reportCount, 1)) desc, max(log.updatedAt) desc
        """)
    List<String> findTopStepNamesByRecruitmentMode(@Param("recruitmentMode") RecruitmentMode recruitmentMode);

    Optional<RollingStepLog> findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndPrevStepNameAndRollingResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
        String companyName,
        RecruitmentMode recruitmentMode,
        String currentStepName,
        String prevStepName,
        RollingReportType rollingResultType,
        LogSourceType sourceType,
        LocalDate prevReportedDate,
        LocalDate reportedDate
    );

    Optional<RollingStepLog> findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndRollingResultTypeAndSourceType(
        String companyName,
        RecruitmentMode recruitmentMode,
        String currentStepName,
        RollingReportType rollingResultType,
        LogSourceType sourceType
    );
}
