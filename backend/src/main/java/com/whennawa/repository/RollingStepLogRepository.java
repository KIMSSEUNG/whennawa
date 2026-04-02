package com.whennawa.repository;

import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.RollingJob;
import com.whennawa.entity.enums.LogSourceType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.RollingReportType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RollingStepLogRepository extends JpaRepository<RollingStepLog, Long> {
    List<RollingStepLog> findByCompanyNameIgnoreCase(String companyName);
    List<RollingStepLog> findByCompanyNameIgnoreCaseAndRecruitmentMode(String companyName, RecruitmentMode recruitmentMode);

    @Query("""
        select log.stepName
        from RollingStepLog log
        where log.stepName is not null
          and log.recruitmentMode = :recruitmentMode
          and trim(log.stepName) <> ''
        group by log.stepName
        order by sum(coalesce(log.reportCount, 1)) desc, max(log.updatedAt) desc
        """)
    List<String> findTopStepNamesByRecruitmentMode(@Param("recruitmentMode") RecruitmentMode recruitmentMode);

    @Query("""
        select log
        from RollingStepLog log
        where log.stepName is not null
          and trim(log.stepName) <> ''
        order by log.updatedAt desc, log.rollingLogId desc
        """)
    List<RollingStepLog> findRecentLogs(Pageable pageable);

    @Query("""
        select log
        from RollingStepLog log
        where log.stepName is not null
          and trim(log.stepName) <> ''
        order by log.updatedAt desc, log.rollingLogId desc
        """)
    List<RollingStepLog> findAllForHotCompanies();

    Optional<RollingStepLog> findFirstByCompanyNameAndRecruitmentModeAndStepNameAndRollingResultTypeAndSourceTypeAndBaseDateAndReportedDate(
        String companyName,
        RecruitmentMode recruitmentMode,
        String stepName,
        RollingReportType rollingResultType,
        LogSourceType sourceType,
        LocalDate baseDate,
        LocalDate reportedDate
    );

    Optional<RollingStepLog> findFirstByCompanyNameAndRecruitmentModeAndStepNameAndRollingResultTypeAndSourceType(
        String companyName,
        RecruitmentMode recruitmentMode,
        String stepName,
        RollingReportType rollingResultType,
        LogSourceType sourceType
    );

    Optional<RollingStepLog> findFirstByCompanyNameAndRollingJobAndRecruitmentModeAndStepNameAndRollingResultTypeAndSourceTypeAndBaseDateAndReportedDate(
        String companyName,
        RollingJob rollingJob,
        RecruitmentMode recruitmentMode,
        String stepName,
        RollingReportType rollingResultType,
        LogSourceType sourceType,
        LocalDate baseDate,
        LocalDate reportedDate
    );

    Optional<RollingStepLog> findFirstByCompanyNameAndRollingJobAndRecruitmentModeAndStepNameAndRollingResultTypeAndSourceType(
        String companyName,
        RollingJob rollingJob,
        RecruitmentMode recruitmentMode,
        String stepName,
        RollingReportType rollingResultType,
        LogSourceType sourceType
    );
}
