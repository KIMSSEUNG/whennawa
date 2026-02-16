package com.whennawa.repository;

import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.enums.RollingReportType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RollingStepLogRepository extends JpaRepository<RollingStepLog, Long> {
    List<RollingStepLog> findByCompanyNameIgnoreCase(String companyName);

    Optional<RollingStepLog> findFirstByCompanyNameAndCurrentStepNameAndRollingResultTypeAndPrevReportedDateAndReportedDate(
        String companyName,
        String currentStepName,
        RollingReportType rollingResultType,
        LocalDate prevReportedDate,
        LocalDate reportedDate
    );

    Optional<RollingStepLog> findFirstByCompanyNameAndCurrentStepNameAndRollingResultType(
        String companyName,
        String currentStepName,
        RollingReportType rollingResultType
    );
}
