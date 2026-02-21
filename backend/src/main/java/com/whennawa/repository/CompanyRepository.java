package com.whennawa.repository;

import com.whennawa.entity.Company;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    interface CompanySearchRow {
        String getCompanyName();
        LocalDateTime getLastResultAt();
    }

    Optional<Company> findByCompanyNameIgnoreCase(String companyName);
    Optional<Company> findByCompanyNameIgnoreCaseAndIsActiveTrue(String companyName);

    @Query("""
        select c.companyName as companyName,
               max(l.targetDate) as lastResultAt
        from Company c
        left join RecruitmentChannel ch on ch.company = c
        left join RecruitmentStep s on s.channel = ch
        left join StepDateLog l on l.step = s
        where c.isActive = true
          and lower(c.companyName) like lower(concat('%', :query, '%'))
        group by c.companyName
        order by c.companyName
        """)
    List<CompanySearchRow> searchCompanies(@Param("query") String query);
}
