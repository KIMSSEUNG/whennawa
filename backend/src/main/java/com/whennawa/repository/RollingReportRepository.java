package com.whennawa.repository;

import com.whennawa.entity.RollingReport;
import com.whennawa.entity.enums.ReportStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RollingReportRepository extends JpaRepository<RollingReport, Long> {
    List<RollingReport> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(ReportStatus status);
    List<RollingReport> findAllByDeletedAtIsNullOrderByCreatedAtDesc();
    Optional<RollingReport> findByReportIdAndDeletedAtIsNull(Long reportId);
    List<RollingReport> findByCompanyNameIgnoreCaseAndStatusAndDeletedAtIsNull(String companyName, ReportStatus status);
    List<RollingReport> findByCompanyAndStatusAndDeletedAtIsNull(
        com.whennawa.entity.Company company,
        ReportStatus status
    );
    long deleteByStatusIn(List<ReportStatus> statuses);

    @Modifying
    @Query("""
        delete from RollingReport r
        where r.status in :statuses
          and not exists (
            select 1
            from InterviewReview ir
            where ir.rollingReport = r
          )
        """)
    long deleteByStatusInWithoutInterviewReviews(@Param("statuses") List<ReportStatus> statuses);
}
