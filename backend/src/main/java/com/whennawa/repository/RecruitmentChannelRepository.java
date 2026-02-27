package com.whennawa.repository;

import com.whennawa.entity.RecruitmentChannel;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecruitmentChannelRepository extends JpaRepository<RecruitmentChannel, Long> {
    @Query("""
        select ch from RecruitmentChannel ch
        where ch.company.companyId = :companyId
        order by ch.year desc
        """)
    List<RecruitmentChannel> findByCompanyId(@Param("companyId") Long companyId);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.company.companyId = :companyId
          and ch.active = true
        order by ch.year desc
        """)
    List<RecruitmentChannel> findActiveByCompanyId(@Param("companyId") Long companyId);
}
