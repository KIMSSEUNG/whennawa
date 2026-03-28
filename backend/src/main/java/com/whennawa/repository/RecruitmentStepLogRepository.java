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
        select log.currentStepName
        from RecruitmentStepLog log
        where log.currentStepName is not null
          and log.recruitmentMode = :recruitmentMode
          and trim(log.currentStepName) <> ''
        group by log.currentStepName
        order by sum(coalesce(log.reportCount, 1)) desc, max(log.updatedAt) desc
        """)
    List<String> findTopStepNamesByRecruitmentMode(@Param("recruitmentMode") RecruitmentMode recruitmentMode);

    @Query("""
        select log
        from RecruitmentStepLog log
        where log.currentStepName is not null
          and trim(log.currentStepName) <> ''
        order by log.updatedAt desc, log.recruitmentLogId desc
        """)
    List<RecruitmentStepLog> findRecentLogs(Pageable pageable);

    @Query("""
        select log
        from RecruitmentStepLog log
        where log.currentStepName is not null
          and trim(log.currentStepName) <> ''
        order by log.updatedAt desc, log.recruitmentLogId desc
        """)
    List<RecruitmentStepLog> findAllForHotCompanies();

    Optional<RecruitmentStepLog> findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndPrevStepNameAndResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
        String companyName,
        RecruitmentMode recruitmentMode,
        String currentStepName,
        String prevStepName,
        RollingReportType resultType,
        LogSourceType sourceType,
        LocalDate prevReportedDate,
        LocalDate reportedDate
    );

    Optional<RecruitmentStepLog> findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndResultTypeAndSourceType(
        String companyName,
        RecruitmentMode recruitmentMode,
        String currentStepName,
        RollingReportType resultType,
        LogSourceType sourceType
    );
}
