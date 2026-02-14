package com.whennawa.repository;

import com.whennawa.entity.RecruitmentStep;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecruitmentStepRepository extends JpaRepository<RecruitmentStep, Long> {
    @Query("""
        select s from RecruitmentStep s
        where s.channel.unit.company.companyId = :companyId
        order by s.stepOrder asc, s.stepId asc
        """)
    List<RecruitmentStep> findTimelineByCompanyId(@Param("companyId") Long companyId);

    @Query("""
        select s from RecruitmentStep s
        where s.channel.channelId = :channelId
        order by s.stepOrder asc, s.stepId asc
        """)
    List<RecruitmentStep> findByChannelId(@Param("channelId") Long channelId);

    long countByChannelChannelId(Long channelId);
}
