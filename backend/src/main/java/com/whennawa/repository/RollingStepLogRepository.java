package com.whennawa.repository;

import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.enums.LogSourceType;
import com.whennawa.entity.enums.RollingReportType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RollingStepLogRepository extends JpaRepository<RollingStepLog, Long> {
    List<RollingStepLog> findByCompanyNameIgnoreCase(String companyName);

    @Query("""
        select log.currentStepName
        from RollingStepLog log
        where log.currentStepName is not null
          and trim(log.currentStepName) <> ''
        group by log.currentStepName
        order by sum(coalesce(log.reportCount, 1)) desc, max(log.updatedAt) desc
        """)
    List<String> findTopStepNames();

    Optional<RollingStepLog> findFirstByCompanyNameAndCurrentStepNameAndRollingResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
        String companyName,
        String currentStepName,
        RollingReportType rollingResultType,
        LogSourceType sourceType,
        LocalDate prevReportedDate,
        LocalDate reportedDate
    );

    Optional<RollingStepLog> findFirstByCompanyNameAndCurrentStepNameAndRollingResultTypeAndSourceType(
        String companyName,
        String currentStepName,
        RollingReportType rollingResultType,
        LogSourceType sourceType
    );
}
