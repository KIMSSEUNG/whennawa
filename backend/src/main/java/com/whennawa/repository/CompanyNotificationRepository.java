package com.whennawa.repository;

import com.whennawa.entity.CompanyNotification;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyNotificationRepository extends JpaRepository<CompanyNotification, Long> {
    Page<CompanyNotification> findByUser_Id(Long userId, Pageable pageable);

    Optional<CompanyNotification> findByNotificationIdAndUser_Id(Long notificationId, Long userId);

    List<CompanyNotification> findByCompanyCompanyIdAndEventDate(Long companyId, LocalDate eventDate);

    long deleteByUpdatedAtBefore(LocalDateTime updatedAt);
}
