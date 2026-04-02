package com.whennawa.repository;

import com.whennawa.entity.RecruitmentStepLog;
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

public interface RecruitmentStepLogRepository extends JpaRepository<RecruitmentStepLog, Long> {
    List<RecruitmentStepLog> findByCompanyNameIgnoreCaseAndRecruitmentMode(String companyName, RecruitmentMode recruitmentMode);

    @Query("""
        select log.stepName
        from RecruitmentStepLog log
        where log.stepName is not null
          and log.recruitmentMode = :recruitmentMode
          and trim(log.stepName) <> ''
        group by log.stepName
        order by sum(coalesce(log.reportCount, 1)) desc, max(log.updatedAt) desc
        """)
    List<String> findTopStepNamesByRecruitmentMode(@Param("recruitmentMode") RecruitmentMode recruitmentMode);

    @Query("""
        select log
        from RecruitmentStepLog log
        where log.stepName is not null
          and trim(log.stepName) <> ''
        order by log.updatedAt desc, log.recruitmentLogId desc
        """)
    List<RecruitmentStepLog> findRecentLogs(Pageable pageable);

    @Query("""
        select log
        from RecruitmentStepLog log
        where log.stepName is not null
          and trim(log.stepName) <> ''
        order by log.updatedAt desc, log.recruitmentLogId desc
        """)
    List<RecruitmentStepLog> findAllForHotCompanies();

    Optional<RecruitmentStepLog> findFirstByCompanyNameAndRecruitmentModeAndStepNameAndResultTypeAndSourceTypeAndBaseDateAndReportedDate(
        String companyName,
        RecruitmentMode recruitmentMode,
        String stepName,
        RollingReportType resultType,
        LogSourceType sourceType,
        LocalDate baseDate,
        LocalDate reportedDate
    );

    Optional<RecruitmentStepLog> findFirstByCompanyNameAndRecruitmentModeAndStepNameAndResultTypeAndSourceType(
        String companyName,
        RecruitmentMode recruitmentMode,
        String stepName,
        RollingReportType resultType,
        LogSourceType sourceType
    );
}
