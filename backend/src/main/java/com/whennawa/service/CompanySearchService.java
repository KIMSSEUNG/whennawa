package com.whennawa.service;

import com.whennawa.dto.company.CompanySearchResponse;
import com.whennawa.dto.company.CompanyTimelineResponse;
import com.whennawa.dto.company.CompanyTimelineStep;
import com.whennawa.dto.company.CompanyUnitTimelineResponse;
import com.whennawa.dto.company.KeywordLeadTimeResponse;
import com.whennawa.dto.company.RollingPredictionResponse;
import com.whennawa.dto.company.RollingStepStatsResponse;
import com.whennawa.entity.Company;
import com.whennawa.entity.RecruitmentChannel;
import com.whennawa.entity.RecruitmentStep;
import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.RecruitmentChannelRepository;
import com.whennawa.repository.RecruitmentStepRepository;
import com.whennawa.repository.RollingStepLogRepository;
import com.whennawa.repository.StepDateLogRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class CompanySearchService {
    private final CompanyRepository companyRepository;
    private final RecruitmentChannelRepository channelRepository;
    private final RecruitmentStepRepository stepRepository;
    private final StepDateLogRepository stepDateLogRepository;
    private final RollingStepLogRepository rollingStepLogRepository;
    private final com.whennawa.config.AppProperties appProperties;

    public CompanySearchService(CompanyRepository companyRepository,
                                RecruitmentChannelRepository channelRepository,
                                RecruitmentStepRepository stepRepository,
                                StepDateLogRepository stepDateLogRepository,
                                RollingStepLogRepository rollingStepLogRepository,
                                com.whennawa.config.AppProperties appProperties) {
        this.companyRepository = companyRepository;
        this.channelRepository = channelRepository;
        this.stepRepository = stepRepository;
        this.stepDateLogRepository = stepDateLogRepository;
        this.rollingStepLogRepository = rollingStepLogRepository;
        this.appProperties = appProperties;
    }

    public List<CompanySearchResponse> searchCompanies(String query, Integer limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        int resolvedLimit = limit == null || limit <= 0 ? Integer.MAX_VALUE : limit;
        return companyRepository.searchCompanies(query).stream()
            .limit(resolvedLimit)
            .map(row -> new CompanySearchResponse(row.getCompanyName(), row.getLastResultAt()))
            .toList();
    }

    public CompanyTimelineResponse getRepresentativeTimeline(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return new CompanyTimelineResponse(null, companyName, List.of(), List.of());
        }
        Company company = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName).orElse(null);
        if (company == null) {
            return new CompanyTimelineResponse(null, companyName, List.of(), List.of());
        }
        List<RollingStepStatsResponse> rollingSteps = buildRollingStats(company.getCompanyName());

        List<RecruitmentChannel> channels = channelRepository.findByCompanyId(company.getCompanyId());
        if (channels.isEmpty()) {
            return new CompanyTimelineResponse(company.getCompanyId(), company.getCompanyName(), List.of(), rollingSteps);
        }

        List<CompanyUnitTimelineResponse> timelines = new ArrayList<>();
        for (RecruitmentChannel channel : channels) {
            List<RecruitmentStep> steps = stepRepository.findByChannelId(channel.getChannelId());
            if (steps.isEmpty()) {
                continue;
            }
            List<CompanyTimelineStep> timeline = buildTimeline(steps, List.of(channel));
            timelines.add(new CompanyUnitTimelineResponse(
                channel.getYear(),
                timeline
            ));
        }

        return new CompanyTimelineResponse(company.getCompanyId(), company.getCompanyName(), timelines, rollingSteps);
    }

    public KeywordLeadTimeResponse getKeywordLeadTime(String companyName, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }
        if (companyName == null || companyName.isBlank()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }
        Company company = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName).orElse(null);
        if (company == null) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }

        String normalizedKeyword = normalizeKeyword(keyword);
        if (normalizedKeyword.isBlank()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }

        List<RecruitmentChannel> channels = channelRepository.findByCompanyId(company.getCompanyId());
        if (channels.isEmpty()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }

        List<Long> allDiffs = new ArrayList<>();
        for (RecruitmentChannel channel : channels) {
            List<RecruitmentStep> steps = stepRepository.findByChannelId(channel.getChannelId());
            if (steps.size() < 2) {
                continue;
            }
            java.util.Map<Long, LocalDateTime> latestDates = loadRepresentativeStepDates(steps);
            for (int i = 1; i < steps.size(); i++) {
                RecruitmentStep current = steps.get(i);
                if (current.getPrevStepId() == null) {
                    continue;
                }
                if (!normalizeKeyword(current.getStepName()).equals(normalizedKeyword)) {
                    continue;
                }
                RecruitmentStep prev = steps.get(i - 1);
                LocalDateTime prevDate = latestDates.get(prev.getStepId());
                LocalDateTime currDate = latestDates.get(current.getStepId());
                if (prevDate == null || currDate == null) {
                    continue;
                }
                long diff = ChronoUnit.DAYS.between(prevDate.toLocalDate(), currDate.toLocalDate());
                if (diff >= 0) {
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
        Company company = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName.trim()).orElse(null);
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

    private List<CompanyTimelineStep> buildTimeline(List<RecruitmentStep> steps,
                                                    List<RecruitmentChannel> channels) {
        List<CompanyTimelineStep> timeline = new ArrayList<>();
        LocalDateTime prev = null;
        java.util.Map<Long, LocalDateTime> latestDates = loadRepresentativeStepDates(steps);

        for (RecruitmentStep step : steps) {
            LocalDateTime current = latestDates.get(step.getStepId());
            Long diffDays = null;
            if (prev != null && current != null) {
                diffDays = ChronoUnit.DAYS.between(prev.toLocalDate(), current.toLocalDate());
            }
            String label = buildStepLabel(step, channels);
            timeline.add(new CompanyTimelineStep("", label, current, diffDays, step.getPrevStepId()));
            if (current != null) {
                prev = current;
            }
        }
        return timeline;
    }

    private java.util.Map<Long, LocalDateTime> loadRepresentativeStepDates(List<RecruitmentStep> steps) {
        if (steps == null || steps.isEmpty()) {
            return java.util.Map.of();
        }
        List<Long> stepIds = steps.stream().map(RecruitmentStep::getStepId).toList();
        List<com.whennawa.entity.StepDateLog> logs = stepDateLogRepository.findByStepStepIdIn(stepIds);
        java.util.Map<Long, java.util.List<LogCandidate>> candidatesByStep = new java.util.HashMap<>();
        for (com.whennawa.entity.StepDateLog log : logs) {
            if (log == null || log.getStep() == null || log.getStep().getStepId() == null) continue;
            Long stepId = log.getStep().getStepId();
            int count = log.getReportCount() == null ? 0 : log.getReportCount();
            boolean isOfficial = log.getDateType() == com.whennawa.entity.enums.StepDateType.OFFICIAL;
            int score = count + (isOfficial ? appProperties.getTimeline().getOfficialScoreBoost() : 0);
            LocalDateTime date = log.getTargetDate();
            if (date == null) continue;
            candidatesByStep.computeIfAbsent(stepId, k -> new java.util.ArrayList<>())
                .add(new LogCandidate(date, score, isOfficial));
        }

        java.util.Map<Long, java.util.List<LogCandidate>> sorted = new java.util.HashMap<>();
        for (Long stepId : stepIds) {
            java.util.List<LogCandidate> list = candidatesByStep.getOrDefault(stepId, java.util.List.of());
            java.util.List<LogCandidate> copy = new java.util.ArrayList<>(list);
            copy.sort((a, b) -> {
                int scoreCmp = Integer.compare(b.score(), a.score());
                if (scoreCmp != 0) return scoreCmp;
                if (a.official() != b.official()) return a.official() ? -1 : 1;
                return b.date().compareTo(a.date());
            });
            sorted.put(stepId, copy);
        }

        java.util.Map<Long, LocalDateTime> selected = new java.util.HashMap<>();
        for (RecruitmentStep step : steps) {
            java.util.List<LogCandidate> list = sorted.getOrDefault(step.getStepId(), java.util.List.of());
            selected.put(step.getStepId(), list.isEmpty() ? null : list.get(0).date());
        }

        for (int iter = 0; iter < 5; iter++) {
            boolean changed = false;
            for (int i = 0; i < steps.size(); i++) {
                Long stepId = steps.get(i).getStepId();
                LocalDateTime prev = i > 0 ? selected.get(steps.get(i - 1).getStepId()) : null;
                LocalDateTime next = i + 1 < steps.size()
                    ? selected.get(steps.get(i + 1).getStepId())
                    : null;
                LocalDateTime best = pickBestCandidate(sorted.getOrDefault(stepId, java.util.List.of()), prev, next);
                LocalDateTime current = selected.get(stepId);
                if ((current == null && best != null) || (current != null && !current.equals(best))) {
                    selected.put(stepId, best);
                    changed = true;
                }
            }
            if (!changed) break;
        }

        return selected;
    }

    private LocalDateTime pickBestCandidate(java.util.List<LogCandidate> candidates,
                                            LocalDateTime prev,
                                            LocalDateTime next) {
        for (LogCandidate candidate : candidates) {
            LocalDateTime date = candidate.date();
            if (prev != null && !date.isAfter(prev)) {
                continue;
            }
            if (next != null && !date.isBefore(next)) {
                continue;
            }
            return date;
        }
        return null;
    }

    private record LogCandidate(LocalDateTime date, int score, boolean official) {}

    private String normalizeKeyword(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private String buildStepLabel(RecruitmentStep step, List<RecruitmentChannel> channels) {
        return step.getStepName();
    }

    private List<RollingStepStatsResponse> buildRollingStats(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return List.of();
        }
        Company company = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName.trim()).orElse(null);
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
}
