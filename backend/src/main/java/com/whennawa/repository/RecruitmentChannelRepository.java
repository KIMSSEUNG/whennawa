package com.whennawa.repository;

import com.whennawa.entity.RecruitmentChannel;
import com.whennawa.entity.enums.RecruitmentChannelType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecruitmentChannelRepository extends JpaRepository<RecruitmentChannel, Long> {
    @Query("""
        select ch from RecruitmentChannel ch
        where ch.unit.company.companyId = :companyId
        order by ch.year desc
        """)
    List<RecruitmentChannel> findByCompanyId(@Param("companyId") Long companyId);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.unit.unitId = :unitId
        """)
    List<RecruitmentChannel> findByUnitId(@Param("unitId") Long unitId);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.unit.unitId = :unitId
          and ch.active = true
        """)
    List<RecruitmentChannel> findActiveByUnitId(@Param("unitId") Long unitId);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.unit.unitId = :unitId
          and ch.active = true
        order by ch.year desc
        """)
    List<RecruitmentChannel> findActiveByUnitIdOrderByYearDesc(@Param("unitId") Long unitId);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.unit.unitId = :unitId
          and ch.channelType = :channelType
          and ch.active = true
        order by ch.year desc
        """)
    List<RecruitmentChannel> findActiveByUnitIdAndType(@Param("unitId") Long unitId,
                                                       @Param("channelType") RecruitmentChannelType channelType);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.unit.unitId = :unitId
          and ch.channelType = :channelType
          and ch.year = :year
        """)
    RecruitmentChannel findByUnitIdAndTypeAndYear(@Param("unitId") Long unitId,
                                                  @Param("channelType") RecruitmentChannelType channelType,
                                                  @Param("year") int year);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.unit.company.companyId = :companyId
          and ch.channelType = :channelType
          and ch.year = :year
        """)
    RecruitmentChannel findByCompanyIdAndTypeAndYear(@Param("companyId") Long companyId,
                                                     @Param("channelType") RecruitmentChannelType channelType,
                                                     @Param("year") int year);

    @Query("""
        select ch from RecruitmentChannel ch
        where ch.unit.company.companyId = :companyId
          and ch.channelType = :channelType
          and ch.active = true
        order by ch.year desc
        """)
    List<RecruitmentChannel> findActiveByCompanyIdAndType(@Param("companyId") Long companyId,
                                                          @Param("channelType") RecruitmentChannelType channelType);
}
