package com.whennawa.repository;

import com.whennawa.entity.Company;
import com.whennawa.entity.CompanyJobCategory;
import com.whennawa.entity.JobCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyJobCategoryRepository extends JpaRepository<CompanyJobCategory, Long> {
    Optional<CompanyJobCategory> findByCompanyAndJobCategoryAndIsActiveTrue(Company company, JobCategory jobCategory);

    List<CompanyJobCategory> findByCompanyCompanyIdAndIsActiveTrueOrderByCompanyJobCategoryIdAsc(Long companyId);
}
