package com.whennawa.repository;

import com.whennawa.entity.CompanyNotificationSubscription;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyNotificationSubscriptionRepository extends JpaRepository<CompanyNotificationSubscription, Long> {
    Optional<CompanyNotificationSubscription> findByUser_IdAndCompanyCompanyId(Long userId, Long companyId);

    Page<CompanyNotificationSubscription> findByUser_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<CompanyNotificationSubscription> findByCompanyCompanyId(Long companyId);

    Optional<CompanyNotificationSubscription> findBySubscriptionIdAndUser_Id(Long subscriptionId, Long userId);
}
