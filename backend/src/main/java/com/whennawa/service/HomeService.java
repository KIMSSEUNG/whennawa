package com.whennawa.service;

import com.whennawa.dto.home.HomeHotCompanyItem;
import com.whennawa.dto.home.HomeLatestReportItem;
import com.whennawa.dto.interview.InterviewReviewItem;
import com.whennawa.entity.Company;
import com.whennawa.entity.InterviewReview;
import com.whennawa.entity.RecruitmentStepLog;
import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.enums.InterviewDifficulty;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.InterviewReviewRepository;
import com.whennawa.repository.RecruitmentStepLogRepository;
import com.whennawa.repository.RollingStepLogRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class HomeService {
    private final RecruitmentStepLogRepository recruitmentStepLogRepository;
    private final RollingStepLogRepository rollingStepLogRepository;
    private final CompanyRepository companyRepository;
    private final InterviewReviewRepository interviewReviewRepository;

    public HomeService(RecruitmentStepLogRepository recruitmentStepLogRepository,
                       RollingStepLogRepository rollingStepLogRepository,
                       CompanyRepository companyRepository,
                       InterviewReviewRepository interviewReviewRepository) {
        this.recruitmentStepLogRepository = recruitmentStepLogRepository;
        this.rollingStepLogRepository = rollingStepLogRepository;
        this.companyRepository = companyRepository;
        this.interviewReviewRepository = interviewReviewRepository;
    }

    public List<HomeLatestReportItem> listLatestReports(Integer limit) {
        int safeLimit = limit == null ? 3 : Math.max(1, Math.min(limit, 10));
        int fetchSize = Math.max(safeLimit * 2, 6);

        List<HomeLatestReportItem> merged = new ArrayList<>();
        for (RecruitmentStepLog log : recruitmentStepLogRepository.findRecentLogs(PageRequest.of(0, fetchSize))) {
            HomeLatestReportItem item = toItem(log);
            if (item != null) {
                merged.add(item);
            }
        }
        for (RollingStepLog log : rollingStepLogRepository.findRecentLogs(PageRequest.of(0, fetchSize))) {
            HomeLatestReportItem item = toItem(log);
            if (item != null) {
                merged.add(item);
            }
        }

        return merged.stream()
            .sorted(Comparator.comparing(HomeLatestReportItem::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .limit(safeLimit)
            .toList();
    }

    public List<HomeHotCompanyItem> listHotCompanies(Integer limit) {
        int safeLimit = limit == null ? 3 : Math.max(1, Math.min(limit, 10));
        Map<String, HotCompanyAggregate> aggregates = new HashMap<>();

        for (RecruitmentStepLog log : recruitmentStepLogRepository.findAllForHotCompanies()) {
            mergeHotCompany(aggregates, log.getCompanyName(), log.getStepName(), log.getUpdatedAt(), log.getReportCount());
        }
        for (RollingStepLog log : rollingStepLogRepository.findAllForHotCompanies()) {
            mergeHotCompany(aggregates, log.getCompanyName(), log.getStepName(), log.getUpdatedAt(), log.getReportCount());
        }

        return aggregates.values().stream()
            .sorted(
                Comparator.comparingInt(HotCompanyAggregate::activityCount).reversed()
                    .thenComparing(HotCompanyAggregate::updatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(HotCompanyAggregate::companyName, String.CASE_INSENSITIVE_ORDER)
            )
            .limit(safeLimit)
            .map(item -> new HomeHotCompanyItem(item.companyId(), item.companyName(), item.latestStepName(), item.activityCount(), item.updatedAt()))
            .toList();
    }

    public List<InterviewReviewItem> listLatestInterviewReviews(Integer limit) {
        int safeLimit = limit == null ? 3 : Math.max(1, Math.min(limit, 10));
        return interviewReviewRepository.findLatestActiveReviews(PageRequest.of(0, safeLimit)).stream()
            .map(this::toInterviewReviewItem)
            .toList();
    }

    private HomeLatestReportItem toItem(RecruitmentStepLog log) {
        if (log == null || isBlank(log.getCompanyName()) || isBlank(log.getStepName())) {
            return null;
        }
        return new HomeLatestReportItem(
            resolveCompanyId(log.getCompanyName()),
            log.getCompanyName().trim(),
            log.getStepName().trim(),
            log.getRecruitmentMode() == null ? RecruitmentMode.REGULAR : log.getRecruitmentMode(),
            fallbackUpdatedAt(log.getUpdatedAt(), log.getCreatedAt())
        );
    }

    private HomeLatestReportItem toItem(RollingStepLog log) {
        if (log == null || isBlank(log.getCompanyName()) || isBlank(log.getStepName())) {
            return null;
        }
        RecruitmentMode mode = log.getRecruitmentMode() == null ? RecruitmentMode.ROLLING : log.getRecruitmentMode();
        return new HomeLatestReportItem(
            resolveCompanyId(log.getCompanyName()),
            log.getCompanyName().trim(),
            log.getStepName().trim(),
            mode,
            fallbackUpdatedAt(log.getUpdatedAt(), log.getCreatedAt())
        );
    }

    private LocalDateTime fallbackUpdatedAt(LocalDateTime updatedAt, LocalDateTime createdAt) {
        return updatedAt != null ? updatedAt : createdAt;
    }

    private InterviewReviewItem toInterviewReviewItem(InterviewReview review) {
        if (review == null || review.getCompany() == null) {
            return null;
        }
        InterviewDifficulty difficulty = review.getDifficulty() == null ? InterviewDifficulty.MEDIUM : review.getDifficulty();
        Integer likeCount = review.getLikeCount();
        return new InterviewReviewItem(
            review.getReviewId(),
            review.getCompany().getCompanyId(),
            review.getCompany().getCompanyName(),
            review.getRecruitmentMode() == null ? RecruitmentMode.REGULAR : review.getRecruitmentMode(),
            review.getStepName(),
            difficulty,
            review.getContent(),
            likeCount == null ? 0 : Math.max(0, likeCount),
            false,
            fallbackUpdatedAt(review.getUpdatedAt(), review.getCreatedAt())
        );
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void mergeHotCompany(Map<String, HotCompanyAggregate> aggregates,
                                 String companyName,
                                 String stepName,
                                 LocalDateTime updatedAt,
                                 Integer reportCount) {
        if (isBlank(companyName) || isBlank(stepName)) {
            return;
        }

        String key = companyName.trim();
        int increment = reportCount == null ? 1 : Math.max(reportCount, 1);
        HotCompanyAggregate current = aggregates.get(key);
        if (current == null) {
            aggregates.put(key, new HotCompanyAggregate(resolveCompanyId(key), key, stepName.trim(), increment, updatedAt));
            return;
        }

        String latestStepName = current.latestStepName();
        LocalDateTime latestUpdatedAt = current.updatedAt();
        if (latestUpdatedAt == null || (updatedAt != null && updatedAt.isAfter(latestUpdatedAt))) {
            latestStepName = stepName.trim();
            latestUpdatedAt = updatedAt;
        }

        aggregates.put(
            key,
            new HotCompanyAggregate(current.companyId(), key, latestStepName, current.activityCount() + increment, latestUpdatedAt)
        );
    }

    private Long resolveCompanyId(String companyName) {
        if (isBlank(companyName)) {
            return null;
        }
        Company company = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName.trim()).orElse(null);
        return company == null ? null : company.getCompanyId();
    }

    private record HotCompanyAggregate(
        Long companyId,
        String companyName,
        String latestStepName,
        int activityCount,
        LocalDateTime updatedAt
    ) {
    }
}
