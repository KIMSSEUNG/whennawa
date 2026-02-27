package com.whennawa.repository;

import com.whennawa.entity.CompanyNameRequest;
import com.whennawa.entity.enums.CompanyRequestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompanyNameRequestRepository extends JpaRepository<CompanyNameRequest, Long> {
    List<CompanyNameRequest> findByStatusOrderByCreatedAtDesc(CompanyRequestStatus status);
    List<CompanyNameRequest> findAllByOrderByCreatedAtDesc();
    Optional<CompanyNameRequest> findByRequestId(Long requestId);

    Optional<CompanyNameRequest> findFirstByNormalizedCompanyNameAndStatusOrderByCreatedAtDesc(
        String normalizedCompanyName,
        CompanyRequestStatus status
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update CompanyNameRequest r set r.requestCount = coalesce(r.requestCount, 0) + 1 where r.requestId = :requestId")
    int incrementRequestCount(@Param("requestId") Long requestId);
}
