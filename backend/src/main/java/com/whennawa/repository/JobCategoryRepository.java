package com.whennawa.repository;

import com.whennawa.entity.JobCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobCategoryRepository extends JpaRepository<JobCategory, Long> {
    Optional<JobCategory> findByJobCategoryIdAndIsActiveTrue(Long jobCategoryId);
    Optional<JobCategory> findByNameAndIsActiveTrue(String name);
    List<JobCategory> findByIsActiveTrueOrderByJobCategoryIdAsc();
}
