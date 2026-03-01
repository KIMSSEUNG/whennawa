package com.whennawa.service;

import com.whennawa.dto.notification.NotificationPageResponse;
import com.whennawa.dto.notification.NotificationSubscriptionResponse;
import com.whennawa.dto.notification.UserNotificationResponse;
import com.whennawa.entity.Company;
import com.whennawa.entity.CompanyNotification;
import com.whennawa.entity.CompanyNotificationSubscription;
import com.whennawa.entity.User;
import com.whennawa.repository.CompanyNotificationRepository;
import com.whennawa.repository.CompanyNotificationSubscriptionRepository;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.UserRepository;
import com.whennawa.util.CompanyNameNormalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private static final int MAX_REPORTER_MESSAGE_LENGTH = 120;

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final CompanyNotificationSubscriptionRepository subscriptionRepository;
    private final CompanyNotificationRepository notificationRepository;

    @Transactional
    public NotificationSubscriptionResponse subscribe(Long userId, String companyNameRaw) {
        User user = findActiveUser(userId);
        Company company = resolveActiveCompany(companyNameRaw);

        CompanyNotificationSubscription existing = subscriptionRepository
            .findByUser_IdAndCompanyCompanyId(user.getId(), company.getCompanyId())
            .orElse(null);
        if (existing != null) {
            return toSubscriptionResponse(existing);
        }

        CompanyNotificationSubscription created = new CompanyNotificationSubscription();
        created.setUser(user);
        created.setCompany(company);
        CompanyNotificationSubscription saved = subscriptionRepository.save(created);
        return toSubscriptionResponse(saved);
    }

    @Transactional
    public void unsubscribe(Long userId, Long subscriptionId) {
        CompanyNotificationSubscription subscription = subscriptionRepository
            .findBySubscriptionIdAndUser_Id(subscriptionId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        subscriptionRepository.delete(subscription);
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse<NotificationSubscriptionResponse> listSubscriptions(Long userId, Integer page, Integer size) {
        int safePage = page == null ? 0 : Math.max(page, 0);
        int safeSize = size == null ? 20 : Math.max(1, Math.min(size, 50));
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<CompanyNotificationSubscription> data = subscriptionRepository.findByUser_IdOrderByCreatedAtDesc(userId, pageable);
        List<NotificationSubscriptionResponse> items = data.getContent().stream().map(this::toSubscriptionResponse).toList();
        return new NotificationPageResponse<>(items, safePage, safeSize, data.hasNext());
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse<UserNotificationResponse> listInbox(Long userId, Integer page, Integer size) {
        int safePage = page == null ? 0 : Math.max(page, 0);
        int safeSize = size == null ? 20 : Math.max(1, Math.min(size, 50));
        Pageable pageable = PageRequest.of(
            safePage,
            safeSize,
            Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("notificationId"))
        );
        Page<CompanyNotification> data = notificationRepository.findByUser_Id(userId, pageable);
        List<UserNotificationResponse> items = data.getContent().stream().map(this::toUserNotificationResponse).toList();
        return new NotificationPageResponse<>(items, safePage, safeSize, data.hasNext());
    }

    @Transactional
    public void deleteNotification(Long userId, Long notificationId) {
        CompanyNotification notification = notificationRepository.findByNotificationIdAndUser_Id(notificationId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        notificationRepository.delete(notification);
    }

    @Transactional
    public void onRegularTodayReport(Company company, LocalDate reportedDate, Long reporterUserId, String reporterMessageRaw) {
        if (company == null || reportedDate == null || !LocalDate.now().equals(reportedDate)) {
            return;
        }

        List<CompanyNotificationSubscription> subscriptions = subscriptionRepository.findByCompanyCompanyId(company.getCompanyId());
        if (subscriptions.isEmpty()) {
            return;
        }

        String reporterNickname = resolveReporterNickname(reporterUserId);
        String reporterMessage = normalizeReporterMessage(reporterMessageRaw);

        List<CompanyNotification> existing = notificationRepository.findByCompanyCompanyIdAndEventDate(company.getCompanyId(), reportedDate);
        Map<Long, CompanyNotification> existingByUserId = new HashMap<>();
        int baseCount = 0;
        for (CompanyNotification notification : existing) {
            if (notification == null || notification.getUser() == null || notification.getUser().getId() == null) {
                continue;
            }
            existingByUserId.put(notification.getUser().getId(), notification);
            int currentCount = notification.getReporterCount() == null ? 0 : notification.getReporterCount();
            if (currentCount > baseCount) {
                baseCount = currentCount;
            }
        }
        int nextCount = Math.max(baseCount, 0) + 1;

        List<CompanyNotification> toSave = new java.util.ArrayList<>();
        for (CompanyNotificationSubscription subscription : subscriptions) {
            if (subscription == null || subscription.getUser() == null || subscription.getUser().isDeleted()) {
                continue;
            }
            Long subscriberId = subscription.getUser().getId();
            if (subscriberId == null) {
                continue;
            }
            CompanyNotification notification = existingByUserId.get(subscriberId);
            if (notification == null) {
                notification = new CompanyNotification();
                notification.setUser(subscription.getUser());
                notification.setCompany(company);
                notification.setEventDate(reportedDate);
                notification.setFirstReporterNickname(reporterNickname);
                notification.setReporterMessage(reporterMessage);
                notification.setReporterCount(nextCount);
                notification.setRead(false);
            } else {
                if (notification.getFirstReporterNickname() == null || notification.getFirstReporterNickname().isBlank()) {
                    notification.setFirstReporterNickname(reporterNickname);
                }
                if ((notification.getReporterMessage() == null || notification.getReporterMessage().isBlank())
                    && reporterMessage != null && !reporterMessage.isBlank()) {
                    notification.setReporterMessage(reporterMessage);
                }
                notification.setReporterCount(nextCount);
                notification.setRead(false);
            }
            toSave.add(notification);
        }
        if (!toSave.isEmpty()) {
            notificationRepository.saveAll(toSave);
        }
    }

    private NotificationSubscriptionResponse toSubscriptionResponse(CompanyNotificationSubscription item) {
        return new NotificationSubscriptionResponse(
            item.getSubscriptionId(),
            item.getCompany() == null ? null : item.getCompany().getCompanyId(),
            item.getCompany() == null ? null : item.getCompany().getCompanyName(),
            item.getCreatedAt()
        );
    }

    private UserNotificationResponse toUserNotificationResponse(CompanyNotification item) {
        String firstReporter = item.getFirstReporterNickname() == null || item.getFirstReporterNickname().isBlank()
            ? "익명"
            : item.getFirstReporterNickname().trim();
        int reporterCount = item.getReporterCount() == null ? 1 : Math.max(item.getReporterCount(), 1);
        String summaryText = String.format(
            "\"%s\"님께서 오늘 결과 발표를 알려주셨습니다.%s",
            firstReporter,
            reporterCount > 1 ? " 외 " + (reporterCount - 1) + "명" : ""
        );

        return new UserNotificationResponse(
            item.getNotificationId(),
            item.getCompany() == null ? null : item.getCompany().getCompanyId(),
            item.getCompany() == null ? null : item.getCompany().getCompanyName(),
            item.getEventDate(),
            firstReporter,
            item.getReporterMessage(),
            reporterCount,
            summaryText,
            item.isRead(),
            item.getCreatedAt(),
            item.getUpdatedAt()
        );
    }

    private Company resolveActiveCompany(String companyNameRaw) {
        String companyName = normalizeCompanyName(companyNameRaw);
        Company found = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName).orElse(null);
        if (found != null) {
            return found;
        }
        String normalizedKey = CompanyNameNormalizer.normalizeKey(companyName);
        if (!normalizedKey.isBlank()) {
            Company normalizedMatch = companyRepository.findAll().stream()
                .filter(Company::isActive)
                .filter(item -> CompanyNameNormalizer.normalizeKey(item.getCompanyName()).equals(normalizedKey))
                .findFirst()
                .orElse(null);
            if (normalizedMatch != null) {
                return normalizedMatch;
            }
        }
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Only registered companies can be subscribed. Please request company addition first."
        );
    }

    private User findActiveUser(Long userId) {
        return userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated"));
    }

    private String normalizeCompanyName(String companyNameRaw) {
        if (companyNameRaw == null || companyNameRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }
        String normalized = CompanyNameNormalizer.normalizeForDisplay(companyNameRaw);
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }
        return normalized;
    }

    private String normalizeReporterMessage(String reporterMessageRaw) {
        if (reporterMessageRaw == null) {
            return null;
        }
        String trimmed = reporterMessageRaw.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        if (trimmed.length() > MAX_REPORTER_MESSAGE_LENGTH) {
            return trimmed.substring(0, MAX_REPORTER_MESSAGE_LENGTH);
        }
        return trimmed;
    }

    private String resolveReporterNickname(Long reporterUserId) {
        if (reporterUserId == null) {
            return "익명";
        }
        return userRepository.findByIdAndDeletedAtIsNull(reporterUserId)
            .map(User::getNickname)
            .filter(name -> name != null && !name.isBlank())
            .map(String::trim)
            .orElse("익명");
    }
}
