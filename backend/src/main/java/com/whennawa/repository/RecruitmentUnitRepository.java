package com.whennawa.repository;

import com.whennawa.entity.RecruitmentUnit;
import com.whennawa.entity.enums.UnitCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecruitmentUnitRepository extends JpaRepository<RecruitmentUnit, Long> {
    @Query("""
        select u from RecruitmentUnit u
        where u.company.companyId = :companyId
        order by u.unitName asc
        """)
    List<RecruitmentUnit> findByCompanyId(@Param("companyId") Long companyId);

    @Query("""
        select u from RecruitmentUnit u
        where u.company.companyId = :companyId
          and u.unitName = :unitName
        """)
    Optional<RecruitmentUnit> findByCompanyIdAndUnitName(@Param("companyId") Long companyId,
                                                          @Param("unitName") UnitCategory unitName);
}
