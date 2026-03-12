package com.whennawa.repository;

import com.whennawa.entity.RecruitmentChannel;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecruitmentChannelRepository extends JpaRepository<RecruitmentChannel, Long> {
    @Query("""
        select ch from RecruitmentChannel ch
        where ch.companyJobCategory.company.companyId = :companyId
        order by ch.year desc
        """)
    List<RecruitmentChannel> findByCompanyId(@Param("companyId") Long companyId);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.companyJobCategory.company.companyId = :companyId
          and ch.active = true
        order by ch.year desc
        """)
    List<RecruitmentChannel> findActiveByCompanyId(@Param("companyId") Long companyId);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.companyJobCategory.company.companyId = :companyId
          and ch.companyJobCategory.jobCategory.jobCategoryId = :jobCategoryId
          and ch.active = true
        order by ch.year desc
        """)
    List<RecruitmentChannel> findActiveByCompanyIdAndJobCategoryId(
        @Param("companyId") Long companyId,
        @Param("jobCategoryId") Long jobCategoryId
    );

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.companyJobCategory.companyJobCategoryId = :companyJobCategoryId
          and ch.active = true
        order by ch.year desc
        """)
    List<RecruitmentChannel> findActiveByCompanyJobCategoryId(@Param("companyJobCategoryId") Long companyJobCategoryId);
}
