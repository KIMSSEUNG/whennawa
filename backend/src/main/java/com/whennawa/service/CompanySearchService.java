package com.whennawa.service;

import com.whennawa.dto.company.CompanySearchResponse;
import com.whennawa.dto.company.CompanyTimelineResponse;
import com.whennawa.dto.company.CompanyTimelineStep;
import com.whennawa.dto.company.CompanyUnitTimelineResponse;
import com.whennawa.dto.company.KeywordLeadTimeResponse;
import com.whennawa.entity.Company;
import com.whennawa.entity.RecruitmentChannel;
import com.whennawa.entity.RecruitmentStep;
import com.whennawa.entity.RecruitmentUnit;
import com.whennawa.entity.enums.RecruitmentChannelType;
import com.whennawa.entity.enums.UnitCategory;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.RecruitmentChannelRepository;
import com.whennawa.repository.RecruitmentStepRepository;
import com.whennawa.repository.RecruitmentUnitRepository;
import com.whennawa.repository.StepDateLogRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class CompanySearchService {
    private final CompanyRepository companyRepository;
    private final RecruitmentChannelRepository channelRepository;
    private final RecruitmentStepRepository stepRepository;
    private final RecruitmentUnitRepository unitRepository;
    private final StepDateLogRepository stepDateLogRepository;
    private final com.whennawa.config.AppProperties appProperties;

    public CompanySearchService(CompanyRepository companyRepository,
                                RecruitmentChannelRepository channelRepository,
                                RecruitmentStepRepository stepRepository,
                                RecruitmentUnitRepository unitRepository,
                                StepDateLogRepository stepDateLogRepository,
                                com.whennawa.config.AppProperties appProperties) {
        this.companyRepository = companyRepository;
        this.channelRepository = channelRepository;
        this.stepRepository = stepRepository;
        this.unitRepository = unitRepository;
        this.stepDateLogRepository = stepDateLogRepository;
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
            return new CompanyTimelineResponse(null, companyName, List.of());
        }
        Company company = companyRepository.findByCompanyNameIgnoreCase(companyName).orElse(null);
        if (company == null) {
            return new CompanyTimelineResponse(null, companyName, List.of());
        }

        List<RecruitmentUnit> units = unitRepository.findByCompanyId(company.getCompanyId());
        if (units.isEmpty()) {
            return new CompanyTimelineResponse(company.getCompanyId(), company.getCompanyName(), List.of());
        }

        List<CompanyUnitTimelineResponse> timelines = new ArrayList<>();
        for (RecruitmentUnit unit : units) {
            RecruitmentChannel channel = pickRepresentativeChannel(unit);
            if (channel == null) {
                continue;
            }
            List<RecruitmentStep> steps = stepRepository.findByChannelId(channel.getChannelId());
            if (steps.isEmpty()) {
                continue;
            }
            List<CompanyTimelineStep> timeline = buildTimeline(steps, List.of(channel));
            timelines.add(new CompanyUnitTimelineResponse(
                unit.getUnitName(),
                channel.getChannelType(),
                channel.getYear(),
                timeline
            ));
        }

        timelines = excludeIntegratedWhenSpecificExists(timelines);
        return new CompanyTimelineResponse(company.getCompanyId(), company.getCompanyName(), timelines);
    }

    public KeywordLeadTimeResponse getKeywordLeadTime(String companyName, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }
        if (companyName == null || companyName.isBlank()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }
        Company company = companyRepository.findByCompanyNameIgnoreCase(companyName).orElse(null);
        if (company == null) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }

        String normalizedKeyword = normalizeKeyword(keyword);
        List<RecruitmentChannel> channels = channelRepository.findByCompanyId(company.getCompanyId());
        if (channels.isEmpty()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }

        List<Long> diffs = new ArrayList<>();
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
                    diffs.add(diff);
                }
            }
        }

        if (diffs.isEmpty()) {
            return new KeywordLeadTimeResponse(keyword, null, null, null);
        }
        Collections.sort(diffs);
        Long median = diffs.get(diffs.size() / 2);
        Long min = diffs.get(0);
        Long max = diffs.get(diffs.size() - 1);
        return new KeywordLeadTimeResponse(keyword, median, min, max);
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

    private List<CompanyUnitTimelineResponse> excludeIntegratedWhenSpecificExists(
        List<CompanyUnitTimelineResponse> timelines
    ) {
        if (timelines == null || timelines.isEmpty()) {
            return List.of();
        }

        java.util.Set<String> keysWithSpecificCategory = new java.util.HashSet<>();
        for (CompanyUnitTimelineResponse timeline : timelines) {
            UnitCategory category = timeline.getUnitName();
            if (category != null && category != UnitCategory.INTEGRATED) {
                keysWithSpecificCategory.add(groupKey(timeline.getChannelType(), timeline.getYear()));
            }
        }

        return timelines.stream()
            .filter(timeline -> {
                UnitCategory category = timeline.getUnitName();
                if (category != UnitCategory.INTEGRATED) {
                    return true;
                }
                return !keysWithSpecificCategory.contains(groupKey(timeline.getChannelType(), timeline.getYear()));
            })
            .toList();
    }

    private String groupKey(RecruitmentChannelType channelType, int year) {
        return channelType.name() + ":" + year;
    }

    private String normalizeKeyword(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private RecruitmentChannel pickRepresentativeChannel(RecruitmentUnit unit) {
        List<RecruitmentChannel> channels = channelRepository.findActiveByUnitId(unit.getUnitId());
        if (channels.isEmpty()) {
            return null;
        }
        RecruitmentChannel best = null;
        long bestCount = -1;
        int bestYear = -1;
        Long bestId = null;
        for (RecruitmentChannel channel : channels) {
            long count = stepRepository.countByChannelChannelId(channel.getChannelId());
            if (count == 0) {
                continue;
            }
            int year = channel.getYear();
            boolean replace = false;
            if (count > bestCount) {
                replace = true;
            } else if (count == bestCount && year > bestYear) {
                replace = true;
            } else if (count == bestCount && year == bestYear && bestId != null
                && channel.getChannelId() > bestId) {
                replace = true;
            }
            if (replace || best == null) {
                best = channel;
                bestCount = count;
                bestYear = year;
                bestId = channel.getChannelId();
            }
        }
        return best;
    }

    private String buildStepLabel(RecruitmentStep step, List<RecruitmentChannel> channels) {
        return step.getStepName();
    }
}
