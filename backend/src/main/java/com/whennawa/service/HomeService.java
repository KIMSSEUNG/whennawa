package com.whennawa.service;

import com.whennawa.dto.home.HomeHotCompanyItem;
import com.whennawa.dto.home.HomeLatestReportItem;
import com.whennawa.entity.RecruitmentStepLog;
import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.enums.RecruitmentMode;
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
    private static final int HOT_COMPANY_LOOKBACK_DAYS = 7;

    private final RecruitmentStepLogRepository recruitmentStepLogRepository;
    private final RollingStepLogRepository rollingStepLogRepository;

    public HomeService(RecruitmentStepLogRepository recruitmentStepLogRepository,
                       RollingStepLogRepository rollingStepLogRepository) {
        this.recruitmentStepLogRepository = recruitmentStepLogRepository;
        this.rollingStepLogRepository = rollingStepLogRepository;
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
        LocalDateTime cutoff = LocalDateTime.now().minusDays(HOT_COMPANY_LOOKBACK_DAYS);
        Map<String, HotCompanyAggregate> aggregates = new HashMap<>();

        for (RecruitmentStepLog log : recruitmentStepLogRepository.findByUpdatedAtAfterOrderByUpdatedAtDesc(cutoff)) {
            mergeHotCompany(aggregates, log.getCompanyName(), log.getCurrentStepName(), log.getUpdatedAt(), log.getReportCount());
        }
        for (RollingStepLog log : rollingStepLogRepository.findByUpdatedAtAfterOrderByUpdatedAtDesc(cutoff)) {
            mergeHotCompany(aggregates, log.getCompanyName(), log.getCurrentStepName(), log.getUpdatedAt(), log.getReportCount());
        }

        return aggregates.values().stream()
            .sorted(
                Comparator.comparingInt(HotCompanyAggregate::activityCount).reversed()
                    .thenComparing(HotCompanyAggregate::updatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(HotCompanyAggregate::companyName, String.CASE_INSENSITIVE_ORDER)
            )
            .limit(safeLimit)
            .map(item -> new HomeHotCompanyItem(item.companyName(), item.latestStepName(), item.activityCount(), item.updatedAt()))
            .toList();
    }

    private HomeLatestReportItem toItem(RecruitmentStepLog log) {
        if (log == null || isBlank(log.getCompanyName()) || isBlank(log.getCurrentStepName())) {
            return null;
        }
        return new HomeLatestReportItem(
            log.getCompanyName().trim(),
            log.getCurrentStepName().trim(),
            log.getRecruitmentMode() == null ? RecruitmentMode.REGULAR : log.getRecruitmentMode(),
            fallbackUpdatedAt(log.getUpdatedAt(), log.getCreatedAt())
        );
    }

    private HomeLatestReportItem toItem(RollingStepLog log) {
        if (log == null || isBlank(log.getCompanyName()) || isBlank(log.getCurrentStepName())) {
            return null;
        }
        RecruitmentMode mode = log.getRecruitmentMode() == null ? RecruitmentMode.ROLLING : log.getRecruitmentMode();
        return new HomeLatestReportItem(
            log.getCompanyName().trim(),
            log.getCurrentStepName().trim(),
            mode,
            fallbackUpdatedAt(log.getUpdatedAt(), log.getCreatedAt())
        );
    }

    private LocalDateTime fallbackUpdatedAt(LocalDateTime updatedAt, LocalDateTime createdAt) {
        return updatedAt != null ? updatedAt : createdAt;
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
            aggregates.put(key, new HotCompanyAggregate(key, stepName.trim(), increment, updatedAt));
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
            new HotCompanyAggregate(key, latestStepName, current.activityCount() + increment, latestUpdatedAt)
        );
    }

    private record HotCompanyAggregate(
        String companyName,
        String latestStepName,
        int activityCount,
        LocalDateTime updatedAt
    ) {
    }
}
