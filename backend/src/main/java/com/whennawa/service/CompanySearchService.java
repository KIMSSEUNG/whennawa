package com.whennawa.service;

import com.whennawa.config.CareerBoardConstants;
import com.whennawa.dto.company.CompanySearchResponse;
import com.whennawa.dto.company.CompanyStatusStep;
import com.whennawa.dto.company.CompanyStatusResponse;
import com.whennawa.dto.company.CompanyYearlyStatusResponse;
import com.whennawa.dto.company.CompanyCreateResponse;
import com.whennawa.dto.company.CompanyListResponse;
import com.whennawa.dto.company.KeywordLeadTimeResponse;
import com.whennawa.dto.company.RollingPredictionResponse;
import com.whennawa.dto.company.RollingStepStatsResponse;
import com.whennawa.dto.interview.InterviewReviewItem;
import com.whennawa.dto.interview.InterviewReviewSort;
import com.whennawa.entity.Company;
import com.whennawa.entity.RecruitmentStepLog;
import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.RecruitmentStepLogRepository;
import com.whennawa.repository.RollingStepLogRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import com.whennawa.util.CompanyNameNormalizer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class CompanySearchService {
    private static final Logger log = LoggerFactory.getLogger(CompanySearchService.class);

    private final CompanyRepository companyRepository;
    private final RecruitmentStepLogRepository recruitmentStepLogRepository;
    private final RollingStepLogRepository rollingStepLogRepository;
    private final com.whennawa.config.AppProperties appProperties;
    private final ProfanityMasker profanityMasker;
    private final InterviewReviewService interviewReviewService;

    public CompanySearchService(CompanyRepository companyRepository,
                                RecruitmentStepLogRepository recruitmentStepLogRepository,
                                RollingStepLogRepository rollingStepLogRepository,
                                com.whennawa.config.AppProperties appProperties,
                                ProfanityMasker profanityMasker,
                                InterviewReviewService interviewReviewService) {
        this.companyRepository = companyRepository;
        this.recruitmentStepLogRepository = recruitmentStepLogRepository;
        this.rollingStepLogRepository = rollingStepLogRepository;
        this.appProperties = appProperties;
        this.profanityMasker = profanityMasker;
        this.interviewReviewService = interviewReviewService;
    }

    public List<CompanySearchResponse> searchCompanies(String query, Integer limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        int resolvedLimit = limit == null || limit <= 0 ? Integer.MAX_VALUE : limit;
        String normalizedQuery = CompanyNameNormalizer.normalizeKey(query);

        java.util.Map<String, CompanySearchResponse> merged = new java.util.LinkedHashMap<>();
        for (var row : companyRepository.searchCompanies(query.trim())) {
            if (row == null || row.getCompanyName() == null) {
                continue;
            }
            if (CareerBoardConstants.CAREER_BOARD_NAME.equalsIgnoreCase(row.getCompanyName().trim())) {
                continue;
            }
            merged.putIfAbsent(row.getCompanyName(), new CompanySearchResponse(row.getCompanyId(), row.getCompanyName(), row.getLastResultAt()));
        }

        if (!normalizedQuery.isBlank()) {
            for (Company company : companyRepository.findAll()) {
                if (company == null || !company.isActive() || company.getCompanyName() == null) {
                    continue;
                }
                if (CareerBoardConstants.CAREER_BOARD_NAME.equalsIgnoreCase(company.getCompanyName().trim())) {
                    continue;
                }
                String key = CompanyNameNormalizer.normalizeKey(company.getCompanyName());
                if (!key.contains(normalizedQuery)) {
                    continue;
                }
                merged.putIfAbsent(company.getCompanyName(), new CompanySearchResponse(company.getCompanyId(), company.getCompanyName(), null));
            }
        }

        return merged.values().stream()
            .sorted(Comparator.comparing(CompanySearchResponse::getCompanyName, String.CASE_INSENSITIVE_ORDER))
            .limit(resolvedLimit)
            .toList();
    }

    public List<CompanyListResponse> listActiveCompanies() {
        return companyRepository.findAll().stream()
            .filter(Company::isActive)
            .filter(company -> company.getCompanyName() != null && !company.getCompanyName().isBlank())
            .filter(company -> !CareerBoardConstants.CAREER_BOARD_NAME.equalsIgnoreCase(company.getCompanyName().trim()))
            .sorted(Comparator.comparing(Company::getCompanyName, String.CASE_INSENSITIVE_ORDER))
            .map(company -> new CompanyListResponse(company.getCompanyId(), company.getCompanyName()))
            .toList();
    }
    public CompanyCreateResponse createCompany(String rawCompanyName) {
        String original = rawCompanyName == null ? "" : rawCompanyName.trim();
        String normalizedName = CompanyNameNormalizer.normalizeForDisplay(rawCompanyName);
        if (normalizedName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }
        if (profanityMasker.containsProfanity(normalizedName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Inappropriate company name is not allowed.");
        }

        Company found = resolveActiveCompany(normalizedName);
        if (found != null) {
            return new CompanyCreateResponse(
                found.getCompanyId(),
                null,
                found.getCompanyName(),
                original,
                false,
                false,
                !found.getCompanyName().equals(original),
                "Company already exists."
            );
        }

        Company created = new Company();
        created.setCompanyName(normalizedName);
        created.setActive(true);
        Company saved = companyRepository.save(created);
        return new CompanyCreateResponse(
            saved.getCompanyId(),
            null,
            saved.getCompanyName(),
            original,
            true,
            false,
            !saved.getCompanyName().equals(original),
            "Company has been created."
        );
    }
    public CompanyStatusResponse getCompanyStatus(String companyName, Long currentUserId) {
        if (companyName == null || companyName.isBlank()) {
            return new CompanyStatusResponse(null, companyName, List.of(), List.of(), List.of(), List.of());
        }
        Company company = resolveActiveCompany(companyName);
        if (company == null) {
            return new CompanyStatusResponse(null, companyName, List.of(), List.of(), List.of(), List.of());
        }
        List<CompanyYearlyStatusResponse> regularTimelines = buildTimelinesByMode(company.getCompanyName(), RecruitmentMode.REGULAR);
        List<CompanyYearlyStatusResponse> internTimelines = buildTimelinesByMode(company.getCompanyName(), RecruitmentMode.INTERN);
        List<RollingStepStatsResponse> rollingSteps = buildRollingStats(company.getCompanyName());
        List<InterviewReviewItem> interviewReviews;
        try {
            interviewReviews = interviewReviewService.listTop(
                company.getCompanyName(),
                10,
                InterviewReviewSort.LIKES,
                currentUserId
            );
        } catch (RuntimeException ex) {
            log.warn("Failed to load interview reviews for company status: {}", company.getCompanyName(), ex);
            interviewReviews = List.of();
        }
        return new CompanyStatusResponse(
            company.getCompanyId(),
            company.getCompanyName(),
            regularTimelines,
            internTimelines,
            rollingSteps,
            interviewReviews
        );
    }

    public CompanyStatusResponse getRepresentativeTimeline(String companyName, Long currentUserId) {
        return getCompanyStatus(companyName, currentUserId);
    }

    public KeywordLeadTimeResponse getKeywordLeadTime(String companyName, String keyword, RecruitmentMode mode) {
        if (keyword == null || keyword.isBlank()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }
        if (companyName == null || companyName.isBlank()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }
        Company company = resolveActiveCompany(companyName);
        if (company == null) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }

        String normalizedKeyword = normalizeKeyword(keyword);
        if (normalizedKeyword.isBlank()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }

        RecruitmentMode resolvedMode = mode == null ? RecruitmentMode.REGULAR : mode;
        if (resolvedMode == RecruitmentMode.ROLLING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lead time mode must be REGULAR or INTERN");
        }

        List<Long> allDiffs = new ArrayList<>();
        List<RecruitmentStepLog> logs = recruitmentStepLogRepository.findByCompanyNameIgnoreCaseAndRecruitmentMode(
            company.getCompanyName(),
            resolvedMode
        );
        for (RecruitmentStepLog log : logs) {
            if (log == null) {
                continue;
            }
            if (!normalizeKeyword(log.getStepName()).equals(normalizedKeyword)) {
                continue;
            }
            RollingReportType type = log.getResultType() == null
                ? RollingReportType.DATE_REPORTED
                : log.getResultType();
            if (type != RollingReportType.DATE_REPORTED) {
                continue;
            }
            if (log.getBaseDate() == null || log.getReportedDate() == null) {
                continue;
            }
            long diff = ChronoUnit.DAYS.between(log.getBaseDate(), log.getReportedDate());
            if (diff >= 0) {
                int reportCount = log.getReportCount() == null ? 1 : Math.max(log.getReportCount(), 1);
                for (int i = 0; i < reportCount; i++) {
                    allDiffs.add(diff);
                }
            }
        }

        if (allDiffs.isEmpty()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }
        allDiffs.sort(Long::compareTo);
        long sum = 0L;
        for (Long diff : allDiffs) {
            sum += diff;
        }
        Long average = Math.round((double) sum / (double) allDiffs.size());
        Long min = allDiffs.get(0);
        Long max = allDiffs.get(allDiffs.size() - 1);
        return new KeywordLeadTimeResponse(keyword, average, min, max);
    }

    public RollingPredictionResponse predictRollingResult(String companyName,
                                                          String stepName,
                                                          LocalDate previousStepDate) {
        if (companyName == null || companyName.isBlank()) {
            return null;
        }
        if (stepName == null || stepName.isBlank() || previousStepDate == null) {
            return null;
        }
        Company company = resolveActiveCompany(companyName.trim());
        if (company == null) {
            return null;
        }
        List<RollingStepStatsResponse> stats = buildRollingStats(company.getCompanyName());
        String normalized = normalizeKeyword(stepName);
        RollingStepStatsResponse matched = stats.stream()
            .filter(item -> normalizeKeyword(item.getStepName()).equals(normalized))
            .findFirst()
            .orElse(null);
        if (matched == null || matched.getAvgDays() == null) {
            return null;
        }
        LocalDate expected = previousStepDate.plusDays(matched.getAvgDays());
        LocalDate expectedStart = matched.getMinDays() == null ? null : previousStepDate.plusDays(matched.getMinDays());
        LocalDate expectedEnd = matched.getMaxDays() == null ? null : previousStepDate.plusDays(matched.getMaxDays());
        return new RollingPredictionResponse(
            matched.getStepName(),
            previousStepDate,
            matched.getSampleCount(),
            expected,
            expectedStart,
            expectedEnd
        );
    }

    private String normalizeKeyword(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private List<RollingStepStatsResponse> buildRollingStats(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return List.of();
        }
        Company company = resolveActiveCompany(companyName.trim());
        if (company == null) {
            return List.of();
        }

        List<RollingStepLog> rollingLogs = rollingStepLogRepository.findByCompanyNameIgnoreCaseAndRecruitmentMode(
            company.getCompanyName(),
            RecruitmentMode.ROLLING
        );
        if (rollingLogs.isEmpty()) {
            return List.of();
        }

        java.util.Map<String, Long> sampleCounts = new java.util.HashMap<>();
        java.util.Map<String, Long> sampleSums = new java.util.HashMap<>();
        java.util.Map<String, Long> sampleMins = new java.util.HashMap<>();
        java.util.Map<String, Long> sampleMaxs = new java.util.HashMap<>();
        java.util.Map<String, Long> noResponseCounts = new java.util.HashMap<>();
        java.util.Map<String, String> labels = new java.util.HashMap<>();
        for (RollingStepLog log : rollingLogs) {
            if (log == null) {
                continue;
            }
            String stepName = log.getStepName();
            if (stepName == null || stepName.isBlank()) {
                continue;
            }
            String key = normalizeKeyword(stepName);
            if (key.isBlank()) {
                continue;
            }
            labels.putIfAbsent(key, stepName.trim());
            int reportCount = log.getReportCount() == null ? 1 : Math.max(log.getReportCount(), 1);
            RollingReportType rollingResultType = log.getRollingResultType() == null
                ? RollingReportType.DATE_REPORTED
                : log.getRollingResultType();
            if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                noResponseCounts.merge(key, (long) reportCount, Long::sum);
                continue;
            }
            if (log.getBaseDate() == null || log.getReportedDate() == null) {
                continue;
            }
            long diff = ChronoUnit.DAYS.between(log.getBaseDate(), log.getReportedDate());
            if (diff < 0 || diff > appProperties.getReport().getRollingMaxDiffDays()) {
                continue;
            }
            sampleCounts.merge(key, (long) reportCount, Long::sum);
            sampleSums.merge(key, diff * (long) reportCount, Long::sum);
            sampleMins.merge(key, diff, Math::min);
            sampleMaxs.merge(key, diff, Math::max);
        }

        java.util.Set<String> allKeys = new java.util.HashSet<>();
        allKeys.addAll(sampleCounts.keySet());
        allKeys.addAll(noResponseCounts.keySet());
        List<RollingStepStatsResponse> result = new ArrayList<>();
        for (String key : allKeys) {
            long count = sampleCounts.getOrDefault(key, 0L);
            long noResponseCount = noResponseCounts.getOrDefault(key, 0L);
            if (count == 0L && noResponseCount == 0L) {
                continue;
            }
            Long min = count == 0L ? null : sampleMins.get(key);
            Long max = count == 0L ? null : sampleMaxs.get(key);
            Long avg = count == 0L ? null : Math.round((double) sampleSums.getOrDefault(key, 0L) / (double) count);
            result.add(new RollingStepStatsResponse(
                labels.getOrDefault(key, key),
                count,
                noResponseCount,
                avg,
                min,
                max
            ));
        }
        result.sort((a, b) -> {
            int bySample = Long.compare(b.getSampleCount(), a.getSampleCount());
            if (bySample != 0) {
                return bySample;
            }
            return Long.compare(b.getNoResponseCount(), a.getNoResponseCount());
        });
        return result;
    }

    private List<CompanyYearlyStatusResponse> buildTimelinesByMode(String companyName, RecruitmentMode mode) {
        if (companyName == null || companyName.isBlank()) {
            return List.of();
        }
        Company company = resolveActiveCompany(companyName.trim());
        if (company == null) {
            return List.of();
        }
        List<RecruitmentStepLog> logs = recruitmentStepLogRepository.findByCompanyNameIgnoreCaseAndRecruitmentMode(
            company.getCompanyName(),
            mode
        );
        if (logs.isEmpty()) {
            return List.of();
        }

        Map<Integer, List<CompanyStatusStep>> byYear = new TreeMap<>(Comparator.reverseOrder());
        for (RecruitmentStepLog log : logs) {
            if (log == null) {
                continue;
            }
            String label = log.getStepName();
            if (label == null || label.isBlank()) {
                continue;
            }
            if (log.getResultType() == RollingReportType.NO_RESPONSE_REPORTED) {
                continue;
            }
            LocalDate reportedDate = log.getReportedDate();
            if (reportedDate == null) {
                continue;
            }
            LocalDateTime occurredAt = reportedDate.atStartOfDay();
            Long diffDays = null;
            if (log.getBaseDate() != null) {
                long diff = ChronoUnit.DAYS.between(log.getBaseDate(), reportedDate);
                diffDays = diff >= 0 ? diff : null;
            }
            CompanyStatusStep step = new CompanyStatusStep("REPORTED", label.trim(), occurredAt, diffDays);
            byYear.computeIfAbsent(reportedDate.getYear(), key -> new ArrayList<>()).add(step);
        }

        if (byYear.isEmpty()) {
            return List.of();
        }

        List<CompanyYearlyStatusResponse> units = new ArrayList<>();
        for (Map.Entry<Integer, List<CompanyStatusStep>> entry : byYear.entrySet()) {
            List<CompanyStatusStep> steps = entry.getValue().stream()
                .sorted(Comparator.comparing(CompanyStatusStep::getOccurredAt).reversed())
                .toList();
            units.add(new CompanyYearlyStatusResponse(entry.getKey(), steps));
        }
        return units;
    }

    public Company resolveActiveCompany(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return null;
        }
        Company exact = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName.trim()).orElse(null);
        if (exact != null) {
            if (CareerBoardConstants.CAREER_BOARD_NAME.equalsIgnoreCase(exact.getCompanyName().trim())) {
                return null;
            }
            return exact;
        }

        String normalizedTarget = CompanyNameNormalizer.normalizeKey(companyName);
        if (normalizedTarget.isBlank()) {
            return null;
        }
        return companyRepository.findAll().stream()
            .filter(Company::isActive)
            .filter(c -> c.getCompanyName() != null)
            .filter(c -> !CareerBoardConstants.CAREER_BOARD_NAME.equalsIgnoreCase(c.getCompanyName().trim()))
            .filter(c -> CompanyNameNormalizer.normalizeKey(c.getCompanyName()).equals(normalizedTarget))
            .findFirst()
            .orElse(null);
    }
}


