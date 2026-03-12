package com.whennawa.repository;

import com.whennawa.entity.Company;
import com.whennawa.entity.RollingJob;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RollingJobRepository extends JpaRepository<RollingJob, Long> {
    Optional<RollingJob> findByCompanyAndNormalizedJobNameAndIsActiveTrue(Company company, String normalizedJobName);
}
