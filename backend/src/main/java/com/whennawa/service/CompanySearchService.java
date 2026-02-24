package com.whennawa.service;

import com.whennawa.dto.company.CompanySearchResponse;
import com.whennawa.dto.company.CompanyTimelineResponse;
import com.whennawa.dto.company.CompanyCreateResponse;
import com.whennawa.dto.company.KeywordLeadTimeResponse;
import com.whennawa.dto.company.RollingPredictionResponse;
import com.whennawa.dto.company.RollingStepStatsResponse;
import com.whennawa.entity.Company;
import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.RollingStepLogRepository;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import com.whennawa.util.CompanyNameNormalizer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CompanySearchService {
    private final CompanyRepository companyRepository;
    private final RollingStepLogRepository rollingStepLogRepository;
    private final com.whennawa.config.AppProperties appProperties;

    public CompanySearchService(CompanyRepository companyRepository,
                                RollingStepLogRepository rollingStepLogRepository,
                                com.whennawa.config.AppProperties appProperties) {
        this.companyRepository = companyRepository;
        this.rollingStepLogRepository = rollingStepLogRepository;
        this.appProperties = appProperties;
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
            merged.putIfAbsent(row.getCompanyName(), new CompanySearchResponse(row.getCompanyName(), row.getLastResultAt()));
        }

        if (!normalizedQuery.isBlank()) {
            for (Company company : companyRepository.findAll()) {
                if (company == null || !company.isActive() || company.getCompanyName() == null) {
                    continue;
                }
                String key = CompanyNameNormalizer.normalizeKey(company.getCompanyName());
                if (!key.contains(normalizedQuery)) {
                    continue;
                }
                merged.putIfAbsent(company.getCompanyName(), new CompanySearchResponse(company.getCompanyName(), null));
            }
        }

        return merged.values().stream()
            .sorted(Comparator.comparing(CompanySearchResponse::getCompanyName, String.CASE_INSENSITIVE_ORDER))
            .limit(resolvedLimit)
            .toList();
    }

    public CompanyCreateResponse createCompany(String rawCompanyName) {
        String original = rawCompanyName == null ? "" : rawCompanyName.trim();
        String normalizedName = CompanyNameNormalizer.normalizeForDisplay(rawCompanyName);
        if (normalizedName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }

        Company found = resolveActiveCompany(normalizedName);
        if (found != null) {
            return new CompanyCreateResponse(
                found.getCompanyId(),
                found.getCompanyName(),
                original,
                false,
                !found.getCompanyName().equals(original)
            );
        }

        Company created = new Company();
        created.setCompanyName(normalizedName);
        created.setActive(true);
        Company saved = companyRepository.save(created);
        return new CompanyCreateResponse(
            saved.getCompanyId(),
            saved.getCompanyName(),
            original,
            true,
            !saved.getCompanyName().equals(original)
        );
    }

    public CompanyTimelineResponse getRepresentativeTimeline(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return new CompanyTimelineResponse(null, companyName, List.of(), List.of());
        }
        Company company = resolveActiveCompany(companyName);
        if (company == null) {
            return new CompanyTimelineResponse(null, companyName, List.of(), List.of());
        }
        List<RollingStepStatsResponse> rollingSteps = buildRollingStats(company.getCompanyName());
        return new CompanyTimelineResponse(company.getCompanyId(), company.getCompanyName(), List.of(), rollingSteps);
    }

    public KeywordLeadTimeResponse getKeywordLeadTime(String companyName, String keyword) {
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

        List<Long> allDiffs = new ArrayList<>();
        List<RollingStepLog> logs = rollingStepLogRepository.findByCompanyNameIgnoreCase(company.getCompanyName());
        for (RollingStepLog log : logs) {
            if (log == null) {
                continue;
            }
            if (!normalizeKeyword(log.getCurrentStepName()).equals(normalizedKeyword)) {
                continue;
            }
            RollingReportType type = log.getRollingResultType() == null
                ? RollingReportType.DATE_REPORTED
                : log.getRollingResultType();
            if (type != RollingReportType.DATE_REPORTED) {
                continue;
            }
            if (log.getPrevReportedDate() == null || log.getReportedDate() == null) {
                continue;
            }
            long diff = ChronoUnit.DAYS.between(log.getPrevReportedDate(), log.getReportedDate());
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
        Long median = allDiffs.get(allDiffs.size() / 2);
        Long min = allDiffs.get(0);
        Long max = allDiffs.get(allDiffs.size() - 1);
        return new KeywordLeadTimeResponse(keyword, median, min, max);
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

        List<RollingStepLog> rollingLogs = rollingStepLogRepository.findByCompanyNameIgnoreCase(company.getCompanyName());
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
            String stepName = log.getCurrentStepName();
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
            if (log.getPrevReportedDate() == null || log.getReportedDate() == null) {
                continue;
            }
            long diff = ChronoUnit.DAYS.between(log.getPrevReportedDate(), log.getReportedDate());
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

    public Company resolveActiveCompany(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return null;
        }
        Company exact = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName.trim()).orElse(null);
        if (exact != null) {
            return exact;
        }

        String normalizedTarget = CompanyNameNormalizer.normalizeKey(companyName);
        if (normalizedTarget.isBlank()) {
            return null;
        }
        return companyRepository.findAll().stream()
            .filter(Company::isActive)
            .filter(c -> c.getCompanyName() != null)
            .filter(c -> CompanyNameNormalizer.normalizeKey(c.getCompanyName()).equals(normalizedTarget))
            .findFirst()
            .orElse(null);
    }
}
