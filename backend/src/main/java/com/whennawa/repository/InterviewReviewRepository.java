package com.whennawa.repository;

import com.whennawa.entity.InterviewReview;
import com.whennawa.entity.enums.RecruitmentMode;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InterviewReviewRepository extends JpaRepository<InterviewReview, Long> {
    Page<InterviewReview> findByCompanyCompanyIdAndIsActiveTrue(Long companyId, Pageable pageable);

    Page<InterviewReview> findByCompanyCompanyIdAndIsActiveTrueAndStepName(Long companyId, String stepName, Pageable pageable);

    Page<InterviewReview> findByCompanyCompanyIdAndIsActiveTrueAndRecruitmentMode(
        Long companyId,
        RecruitmentMode recruitmentMode,
        Pageable pageable
    );

    Page<InterviewReview> findByCompanyCompanyIdAndIsActiveTrueAndRecruitmentModeAndStepName(
        Long companyId,
        RecruitmentMode recruitmentMode,
        String stepName,
        Pageable pageable
    );

    Optional<InterviewReview> findByReviewIdAndIsActiveTrue(Long reviewId);

    Optional<InterviewReview> findTopByReportReportIdAndIsActiveTrueOrderByCreatedAtDesc(Long reportId);

    Optional<InterviewReview> findTopByRollingReportReportIdAndIsActiveTrueOrderByCreatedAtDesc(Long reportId);

    @Query("""
        select distinct r.stepName
        from InterviewReview r
        where r.company.companyId = :companyId
          and r.isActive = true
          and r.stepName is not null
          and trim(r.stepName) <> ''
        order by r.stepName asc
        """)
    List<String> findDistinctStepNamesByCompanyId(@Param("companyId") Long companyId);

    @Query("""
        select distinct r.stepName
        from InterviewReview r
        where r.company.companyId = :companyId
          and r.recruitmentMode = :mode
          and r.isActive = true
          and r.stepName is not null
          and trim(r.stepName) <> ''
        order by r.stepName asc
        """)
    List<String> findDistinctStepNamesByCompanyIdAndMode(@Param("companyId") Long companyId, @Param("mode") RecruitmentMode mode);
}
