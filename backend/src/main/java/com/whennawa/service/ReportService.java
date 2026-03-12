package com.whennawa.service;

import com.whennawa.config.AppProperties;
import com.whennawa.dto.report.CategoryJobItem;
import com.whennawa.dto.report.JobCategoryItem;
import com.whennawa.dto.report.ReportAdminItem;
import com.whennawa.dto.report.ReportCreateRequest;
import com.whennawa.dto.report.ReportCreateResponse;
import com.whennawa.dto.report.ReportJobMergeRequest;
import com.whennawa.dto.report.ReportStepResponse;
import com.whennawa.dto.report.ReportUpdateRequest;
import com.whennawa.entity.Company;
import com.whennawa.entity.CompanyJobCategory;
import com.whennawa.entity.InterviewReview;
import com.whennawa.entity.JobCategory;
import com.whennawa.entity.RecruitmentStepLog;
import com.whennawa.entity.RecruitmentChannel;
import com.whennawa.entity.RecruitmentStep;
import com.whennawa.entity.RecruitmentStepMaster;
import com.whennawa.entity.RecruitmentStepPair;
import com.whennawa.entity.RollingJob;
import com.whennawa.entity.RollingReport;
import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.enums.JobReviewStatus;
import com.whennawa.entity.enums.LogSourceType;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.StepKind;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.CompanyJobCategoryRepository;
import com.whennawa.repository.InterviewReviewRepository;
import com.whennawa.repository.JobCategoryRepository;
import com.whennawa.repository.RecruitmentChannelRepository;
import com.whennawa.repository.RecruitmentStepLogRepository;
import com.whennawa.repository.RecruitmentStepRepository;
import com.whennawa.repository.RecruitmentStepMasterRepository;
import com.whennawa.repository.RecruitmentStepPairRepository;
import com.whennawa.repository.RollingJobRepository;
import com.whennawa.repository.RollingReportRepository;
import com.whennawa.repository.RollingStepLogRepository;
import com.whennawa.repository.StepDateReportRepository;
import com.whennawa.util.CompanyNameNormalizer;
import com.whennawa.util.StepTextNormalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final CompanyRepository companyRepository;
    private final CompanyJobCategoryRepository companyJobCategoryRepository;
    private final InterviewReviewRepository interviewReviewRepository;
    private final JobCategoryRepository jobCategoryRepository;
    private final RecruitmentChannelRepository channelRepository;
    private final RecruitmentStepLogRepository recruitmentStepLogRepository;
    private final RecruitmentStepRepository stepRepository;
    private final RecruitmentStepMasterRepository stepMasterRepository;
    private final RecruitmentStepPairRepository stepPairRepository;
    private final RollingJobRepository rollingJobRepository;
    private final StepDateReportRepository reportRepository;
    private final RollingReportRepository rollingReportRepository;
    private final RollingStepLogRepository rollingStepLogRepository;
    private final NotificationService notificationService;
    private final InterviewReviewService interviewReviewService;
    private final AppProperties appProperties;
    private final ConcurrentMap<String, Long> lastReportAtByIp = new ConcurrentHashMap<>();

    @Transactional
    public ReportCreateResponse createReport(ReportCreateRequest request, String clientIp, Long reporterUserId) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing request");
        }
        enforceCooldown(clientIp);

        String requestedCompanyName = normalizeCompanyName(request.getCompanyName());
        Company company = findCompany(requestedCompanyName);
        String companyName = canonicalCompanyName(requestedCompanyName, company);
        RecruitmentMode mode = request.getRecruitmentMode();
        if (mode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recruitment mode is required");
        }
        String prevStepName = normalizeCurrentStepName(request.getPrevStepName());
        String currentStepName = normalizeCurrentStepName(request.getCurrentStepName());
        RollingReportType rollingResultType = resolveRollingResultType(mode, request.getRollingResultType());
        LocalDate prevReportedDate = request.getPrevReportedDate();
        LocalDate reportedDate = request.getReportedDate();

        if (!isRollingMode(mode)) {
            JobSelection jobSelection = resolveJobSelection(request.getJobCategoryId(), request.getOtherJobName(), company);
            if (company != null) {
                ensureCompanyJobCategory(company, jobSelection.jobCategory());
            }
            validateRegularFields(prevStepName, currentStepName, prevReportedDate, reportedDate);
            StepDateReport duplicate = findPendingDuplicateReport(
                companyName,
                mode,
                null,
                prevStepName,
                currentStepName,
                prevReportedDate,
                reportedDate,
                jobSelection.jobCategory(),
                jobSelection.otherJobName()
            );
            if (duplicate != null) {
                int current = duplicate.getReportCount() == null ? 0 : duplicate.getReportCount();
                duplicate.setReportCount(current + 1);
                if ((duplicate.getCurrentStepName() == null || duplicate.getCurrentStepName().isBlank())
                    && currentStepName != null && !currentStepName.isBlank()) {
                    duplicate.setCurrentStepName(currentStepName);
                }
                if ((duplicate.getPrevStepName() == null || duplicate.getPrevStepName().isBlank())
                    && prevStepName != null && !prevStepName.isBlank()) {
                    duplicate.setPrevStepName(prevStepName);
                }
                if (duplicate.getPrevReportedDate() == null && prevReportedDate != null) {
                    duplicate.setPrevReportedDate(prevReportedDate);
                }
                if (duplicate.getJobCategory() == null) {
                    duplicate.setJobCategory(jobSelection.jobCategory());
                }
                if ((duplicate.getOtherJobName() == null || duplicate.getOtherJobName().isBlank())
                    && jobSelection.otherJobName() != null) {
                    duplicate.setOtherJobName(jobSelection.otherJobName());
                }
                reportRepository.save(duplicate);
                interviewReviewService.createForRegularReport(
                    duplicate,
                    reporterUserId,
                    request.getInterviewReviewContent(),
                    request.getInterviewDifficulty()
                );
                if (mode == RecruitmentMode.REGULAR && Boolean.TRUE.equals(request.getTodayAnnouncement())) {
                    notificationService.onRegularTodayReport(company, reportedDate, reporterUserId, request.getNotificationMessage());
                }
                return new ReportCreateResponse(duplicate.getReportId());
            }

            StepDateReport report = new StepDateReport();
            report.setCompany(company);
            report.setJobCategory(jobSelection.jobCategory());
            report.setOtherJobName(jobSelection.otherJobName());
            report.setJobReviewStatus(JobReviewStatus.PENDING);
            report.setJobReviewedAt(null);
            report.setCompanyName(companyName);
            report.setRecruitmentMode(mode);
            report.setRollingResultType(null);
            report.setPrevReportedDate(prevReportedDate);
            report.setPrevStepName(prevStepName);
            report.setCurrentStepName(currentStepName);
            report.setReportedDate(reportedDate);
            report.setStatus(ReportStatus.PENDING);

            StepDateReport saved = reportRepository.save(report);
            interviewReviewService.createForRegularReport(
                saved,
                reporterUserId,
                request.getInterviewReviewContent(),
                request.getInterviewDifficulty()
            );
            if (mode == RecruitmentMode.REGULAR && Boolean.TRUE.equals(request.getTodayAnnouncement())) {
                notificationService.onRegularTodayReport(company, reportedDate, reporterUserId, request.getNotificationMessage());
            }
            return new ReportCreateResponse(saved.getReportId());
        } else {
            validateRollingFields(prevStepName, currentStepName, prevReportedDate, reportedDate, rollingResultType);
            if (company == null) {
                Company created = new Company();
                created.setCompanyName(canonicalCompanyName(requestedCompanyName, null));
                created.setActive(true);
                company = companyRepository.save(created);
                companyName = company.getCompanyName();
            }
            RollingJob rollingJob = resolveRollingJobSelection(request.getRollingJobName(), request.getJobCategoryId(), request.getOtherJobName(), company);
            RollingReport duplicate = findPendingDuplicateRollingReport(
                companyName,
                rollingResultType,
                prevStepName,
                currentStepName,
                prevReportedDate,
                reportedDate,
                rollingJob
            );
            if (duplicate != null) {
                int current = duplicate.getReportCount() == null ? 0 : duplicate.getReportCount();
                duplicate.setReportCount(current + 1);
                if ((duplicate.getCurrentStepName() == null || duplicate.getCurrentStepName().isBlank())
                    && currentStepName != null && !currentStepName.isBlank()) {
                    duplicate.setCurrentStepName(currentStepName);
                }
                if ((duplicate.getPrevStepName() == null || duplicate.getPrevStepName().isBlank())
                    && prevStepName != null && !prevStepName.isBlank()) {
                    duplicate.setPrevStepName(prevStepName);
                }
                if (duplicate.getPrevReportedDate() == null && prevReportedDate != null) {
                    duplicate.setPrevReportedDate(prevReportedDate);
                }
                if (duplicate.getRollingJob() == null) {
                    duplicate.setRollingJob(rollingJob);
                }
                rollingReportRepository.save(duplicate);
                interviewReviewService.createForRollingReport(
                    duplicate,
                    reporterUserId,
                    request.getInterviewReviewContent(),
                    request.getInterviewDifficulty()
                );
                return new ReportCreateResponse(duplicate.getReportId());
            }

            RollingReport report = new RollingReport();
            report.setCompany(company);
            report.setRollingJob(rollingJob);
            report.setJobCategory(null);
            report.setOtherJobName(rollingJob.getJobName());
            report.setJobReviewStatus(JobReviewStatus.PENDING);
            report.setJobReviewedAt(null);
            report.setCompanyName(companyName);
            report.setRollingResultType(rollingResultType);
            report.setPrevReportedDate(rollingResultType == RollingReportType.DATE_REPORTED ? prevReportedDate : null);
            report.setPrevStepName(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : prevStepName);
            report.setCurrentStepName(currentStepName);
            report.setReportedDate(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : reportedDate);
            report.setStatus(ReportStatus.PENDING);

            RollingReport saved = rollingReportRepository.save(report);
            interviewReviewService.createForRollingReport(
                saved,
                reporterUserId,
                request.getInterviewReviewContent(),
                request.getInterviewDifficulty()
            );
            return new ReportCreateResponse(saved.getReportId());
        }
    }

    @Transactional(readOnly = true)
    public List<ReportStepResponse> findStepsForCompany(String companyName) {
        return findStepsForCompany(companyName, null);
    }

    @Transactional(readOnly = true)
    public List<ReportStepResponse> findStepsForCompany(String companyName, Long jobCategoryId) {
        if (companyName == null || companyName.isBlank()) {
            return List.of();
        }
        Company company = findCompany(companyName.trim());
        if (company == null) {
            return List.of();
        }

        List<RecruitmentChannel> channels;
        if (jobCategoryId == null) {
            channels = channelRepository.findActiveByCompanyId(company.getCompanyId());
        } else {
            JobCategory category = resolveJobCategoryById(jobCategoryId);
            channels = channelRepository.findActiveByCompanyIdAndJobCategoryId(company.getCompanyId(), category.getJobCategoryId());
        }
        if (channels.isEmpty()) {
            return List.of();
        }
        return stepsForChannel(channels.get(0));
    }

    @Transactional(readOnly = true)
    public List<String> findRollingStepNameSuggestions(String companyName,
                                                       String query,
                                                       RecruitmentMode mode,
                                                       Long jobCategoryId,
                                                       String kind) {
        String normalizedQuery = normalizeKeyword(query);
        Map<String, String> suggestions = new LinkedHashMap<>();
        RecruitmentMode targetMode = mode == null ? RecruitmentMode.ROLLING : mode;
        StepKind targetKind = parseSuggestionKind(kind);

        if (companyName != null && !companyName.isBlank() && jobCategoryId != null) {
            Company company = findCompany(companyName.trim());
            if (company != null) {
                JobCategory category = resolveJobCategoryById(jobCategoryId);
                CompanyJobCategory companyJobCategory = companyJobCategoryRepository
                    .findByCompanyAndJobCategoryAndIsActiveTrue(company, category)
                    .orElse(null);
                if (companyJobCategory != null) {
                    List<RecruitmentStepPair> pairs = stepPairRepository
                        .findByCompanyJobCategoryAndIsActiveTrueOrderByPairIdAsc(companyJobCategory);
                    for (RecruitmentStepPair pair : pairs) {
                        if (pair == null) {
                            continue;
                        }
                        if (targetKind == StepKind.PREV) {
                            addSuggestion(suggestions, pair.getPrevStepMaster() == null ? null : pair.getPrevStepMaster().getStepName());
                        } else if (targetKind == StepKind.CURRENT) {
                            addSuggestion(suggestions, pair.getCurrentStepMaster() == null ? null : pair.getCurrentStepMaster().getStepName());
                        } else {
                            addSuggestion(suggestions, pair.getPrevStepMaster() == null ? null : pair.getPrevStepMaster().getStepName());
                            addSuggestion(suggestions, pair.getCurrentStepMaster() == null ? null : pair.getCurrentStepMaster().getStepName());
                        }
                    }
                }
            }
        }

        if (suggestions.isEmpty()) {
            List<RecruitmentStepMaster> masters = targetKind == StepKind.PREV
                ? stepMasterRepository.findByStepKindInAndIsActiveTrueOrderByStepMasterIdAsc(List.of(StepKind.PREV, StepKind.BOTH))
                : targetKind == StepKind.CURRENT
                    ? stepMasterRepository.findByStepKindInAndIsActiveTrueOrderByStepMasterIdAsc(List.of(StepKind.CURRENT, StepKind.BOTH))
                    : stepMasterRepository.findByIsActiveTrueOrderByStepMasterIdAsc();
            for (RecruitmentStepMaster master : masters) {
                addSuggestion(suggestions, master == null ? null : master.getStepName());
            }
        }

        if (suggestions.isEmpty()) {
            if (companyName == null || companyName.isBlank()) {
                List<String> topStepNames = targetMode == RecruitmentMode.ROLLING
                    ? rollingStepLogRepository.findTopStepNamesByRecruitmentMode(targetMode)
                    : recruitmentStepLogRepository.findTopStepNamesByRecruitmentMode(targetMode);
                for (String stepName : topStepNames) {
                    addSuggestion(suggestions, stepName);
                }
                if (targetMode == RecruitmentMode.ROLLING) {
                    List<RollingReport> recentRollingReports = rollingReportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
                    for (RollingReport report : recentRollingReports) {
                        if (report == null) {
                            continue;
                        }
                        if (targetKind == StepKind.PREV) {
                            addSuggestion(suggestions, report.getPrevStepName());
                        } else {
                            addSuggestion(suggestions, report.getCurrentStepName());
                        }
                    }
                } else {
                    List<StepDateReport> recentReports = reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
                    for (StepDateReport report : recentReports) {
                        if (report == null) {
                            continue;
                        }
                        if (report.getRecruitmentMode() != targetMode) {
                            continue;
                        }
                        if (targetKind == StepKind.PREV) {
                            addSuggestion(suggestions, report.getPrevStepName());
                        } else {
                            addSuggestion(suggestions, report.getCurrentStepName());
                        }
                    }
                }
            } else {
                Company company = findCompany(companyName.trim());
                if (company != null) {
                    if (targetMode == RecruitmentMode.ROLLING) {
                        List<RollingStepLog> rollingLogs = rollingStepLogRepository.findByCompanyNameIgnoreCaseAndRecruitmentMode(
                            company.getCompanyName(),
                            targetMode
                        );
                        for (RollingStepLog log : rollingLogs) {
                            addSuggestion(suggestions, log == null ? null : log.getCurrentStepName());
                        }
                    } else {
                        List<RecruitmentStepLog> regularLogs = recruitmentStepLogRepository.findByCompanyNameIgnoreCaseAndRecruitmentMode(
                            company.getCompanyName(),
                            targetMode
                        );
                        for (RecruitmentStepLog log : regularLogs) {
                            addSuggestion(suggestions, log == null ? null : log.getCurrentStepName());
                        }
                    }
                    if (targetMode == RecruitmentMode.ROLLING) {
                        List<RollingReport> recentRollingReports = rollingReportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
                        for (RollingReport report : recentRollingReports) {
                            if (report == null) {
                                continue;
                            }
                            String reportCompanyName = report.getCompanyName();
                            if (reportCompanyName == null
                                || !normalizeCompanyKey(reportCompanyName).equals(normalizeCompanyKey(company.getCompanyName()))) {
                                continue;
                            }
                            if (targetKind == StepKind.PREV) {
                                addSuggestion(suggestions, report.getPrevStepName());
                            } else {
                                addSuggestion(suggestions, report.getCurrentStepName());
                            }
                        }
                    } else {
                        List<StepDateReport> recentReports = reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
                        for (StepDateReport report : recentReports) {
                            if (report == null) {
                                continue;
                            }
                            if (report.getRecruitmentMode() != targetMode) {
                                continue;
                            }
                            String reportCompanyName = report.getCompanyName();
                            if (reportCompanyName == null
                                || !normalizeCompanyKey(reportCompanyName).equals(normalizeCompanyKey(company.getCompanyName()))) {
                                continue;
                            }
                            if (targetKind == StepKind.PREV) {
                                addSuggestion(suggestions, report.getPrevStepName());
                            } else {
                                addSuggestion(suggestions, report.getCurrentStepName());
                            }
                        }
                    }
                }
            }
        }

        return suggestions.values().stream()
            .filter(name -> normalizedQuery.isBlank() || normalizeKeyword(name).contains(normalizedQuery))
            .limit(20)
            .toList();
    }

    private StepKind parseSuggestionKind(String kind) {
        if (kind == null || kind.isBlank()) {
            return StepKind.CURRENT;
        }
        String normalized = kind.trim().toUpperCase();
        if ("PREV".equals(normalized)) {
            return StepKind.PREV;
        }
        if ("BOTH".equals(normalized)) {
            return StepKind.BOTH;
        }
        return StepKind.CURRENT;
    }

    @Transactional(readOnly = true)
    public String resolveRollingStepPair(String companyName, Long jobCategoryId, String direction, String stepName) {
        if (direction == null || direction.isBlank()
            || stepName == null || stepName.isBlank()) {
            return null;
        }
        String normalizedDirection = direction.trim().toLowerCase();
        if (!"prev_to_current".equals(normalizedDirection) && !"current_to_prev".equals(normalizedDirection)) {
            return null;
        }
        String normalizedStepName = normalizeCurrentStepName(stepName);
        if (normalizedStepName == null) {
            return null;
        }

        if (companyName != null && !companyName.isBlank() && jobCategoryId != null) {
            Company company = findCompany(companyName.trim());
            if (company != null) {
                JobCategory category = resolveJobCategoryById(jobCategoryId);
                CompanyJobCategory companyJobCategory = companyJobCategoryRepository
                    .findByCompanyAndJobCategoryAndIsActiveTrue(company, category)
                    .orElse(null);
                if (companyJobCategory != null) {
                    RecruitmentStepMaster master = findActiveMasterByStepName(normalizedStepName);
                    if (master != null) {
                        if ("prev_to_current".equals(normalizedDirection)) {
                            String matched = stepPairRepository.findFirstByCompanyJobCategoryAndPrevStepMasterAndIsActiveTrue(companyJobCategory, master)
                                .map(pair -> pair.getCurrentStepMaster().getStepName())
                                .orElse(null);
                            if (matched != null && !matched.isBlank()) {
                                return matched;
                            }
                        }
                        if ("current_to_prev".equals(normalizedDirection)) {
                            String matched = stepPairRepository.findFirstByCompanyJobCategoryAndCurrentStepMasterAndIsActiveTrue(companyJobCategory, master)
                                .map(pair -> pair.getPrevStepMaster().getStepName())
                                .orElse(null);
                            if (matched != null && !matched.isBlank()) {
                                return matched;
                            }
                        }
                    }
                }
            }
        }

        return resolveRollingStepPairByRule(normalizedDirection, normalizedStepName);
    }

    private String resolveRollingStepPairByRule(String direction, String stepName) {
        if (stepName == null || stepName.isBlank()) {
            return null;
        }
        if ("prev_to_current".equals(direction)) {
            if (stepName.endsWith("\uBC1C\uD45C")) {
                return null;
            }
            return stepName + " \uBC1C\uD45C";
        }
        if ("current_to_prev".equals(direction)) {
            if (!stepName.endsWith("\uBC1C\uD45C")) {
                return null;
            }
            String base = stepName.replaceFirst("\\s*\\uBC1C\\uD45C$", "").trim();
            return base.isBlank() ? null : base;
        }
        return null;
    }

    @Transactional(readOnly = true)
    public List<JobCategoryItem> findActiveJobCategories() {
        return jobCategoryRepository.findByIsActiveTrueOrderByJobCategoryIdAsc().stream()
            .map(category -> new JobCategoryItem(
                category.getJobCategoryId(),
                category.getName()
            ))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryJobItem> findCategoryJobs(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return List.of();
        }
        Company company = findCompany(companyName.trim());
        if (company == null) {
            return List.of();
        }
        return companyJobCategoryRepository.findByCompanyCompanyIdAndIsActiveTrueOrderByCompanyJobCategoryIdAsc(company.getCompanyId())
            .stream()
            .map(item -> new CategoryJobItem(
                item.getCompanyJobCategoryId(),
                item.getJobCategory().getJobCategoryId(),
                item.getJobCategory().getName()
            ))
            .toList();
    }

    @Transactional
    public JobCategoryItem createJobCategory(String nameRaw) {
        if (nameRaw == null || nameRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        String name = StepTextNormalizer.normalizeDisplay(nameRaw);
        if (name.length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name must be 50 characters or less");
        }
        String normalizedNameKey = normalizeKeyword(name);
        boolean duplicated = jobCategoryRepository.findByIsActiveTrueOrderByJobCategoryIdAsc().stream()
            .map(JobCategory::getName)
            .anyMatch(existingName -> normalizeKeyword(existingName).equals(normalizedNameKey));
        if (duplicated) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Job category already exists");
        }
        JobCategory created = new JobCategory();
        created.setName(name);
        created.setActive(true);
        JobCategory saved = jobCategoryRepository.save(created);
        return new JobCategoryItem(saved.getJobCategoryId(), saved.getName());
    }

    @Transactional(readOnly = true)
    public List<ReportAdminItem> findAdminRegularReports(ReportStatus status) {
        return findAdminReports(status).stream()
            .filter(item -> item.getRecruitmentMode() != RecruitmentMode.ROLLING)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ReportAdminItem> findAdminRollingReports(ReportStatus status) {
        List<RollingReport> reports = status == null
            ? rollingReportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc()
            : rollingReportRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(status);
        return reports.stream().map(this::toAdminItem).toList();
    }

    @Transactional(readOnly = true)
    public List<ReportStepResponse> findRegularStepsForReport(Long reportId) {
        return findStepsForReport(reportId);
    }

    @Transactional
    public ReportAdminItem updateRegularReport(Long reportId, ReportUpdateRequest request) {
        if (request != null && request.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use rolling update API for rolling reports");
        }
        return updateReport(reportId, request);
    }

    @Transactional
    public ReportAdminItem assignRegularReportValues(Long reportId) {
        return assignReportValues(reportId);
    }

    @Transactional
    public int assignAllPendingRegularReports() {
        return assignAllPendingReports();
    }

    @Transactional
    public ReportAdminItem processRegularReport(Long reportId) {
        return processReport(reportId);
    }

    @Transactional
    public ReportAdminItem discardRegularReport(Long reportId) {
        return discardReport(reportId);
    }

    @Transactional
    public ReportAdminItem approveRegularJobReview(Long reportId) {
        return approveJobReview(reportId);
    }

    @Transactional
    public ReportAdminItem rejectRegularJobReview(Long reportId) {
        return rejectJobReview(reportId);
    }

    @Transactional
    public ReportAdminItem mergeRegularOtherJobCategory(Long reportId, Long targetJobCategoryId, ReportJobMergeRequest.MergeDecision decision) {
        return mergeOtherJobCategory(reportId, targetJobCategoryId, decision);
    }

    @Transactional(readOnly = true)
    public List<ReportAdminItem> findAdminReports(ReportStatus status) {
        List<StepDateReport> reports = status == null
            ? reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc()
            : reportRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(status);

        return reports.stream().map(this::toAdminItem).toList();
    }

    @Transactional(readOnly = true)
    public List<ReportStepResponse> findStepsForReport(Long reportId) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            return List.of();
        }
        if (report.getCompany() == null) {
            return List.of();
        }

        RecruitmentChannel channel = resolveChannelForReport(report);
        if (channel == null) {
            return List.of();
        }
        return stepRepository.findByChannelId(channel.getChannelId()).stream()
            .map(step -> new ReportStepResponse(step.getStepId(), step.getStepName()))
            .toList();
    }

    @Transactional
    public ReportAdminItem updateReport(Long reportId, ReportUpdateRequest request) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be updated");
        }

        String requestedCompanyName = normalizeCompanyName(request.getCompanyName());
        Company company = findCompany(requestedCompanyName);
        String companyName = canonicalCompanyName(requestedCompanyName, company);
        String prevStepName = normalizeCurrentStepName(request.getPrevStepName());
        String currentStepName = normalizeCurrentStepName(request.getCurrentStepName());
        RecruitmentMode mode = request.getRecruitmentMode();
        if (mode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recruitment mode is required");
        }
        RollingReportType rollingResultType = resolveRollingResultType(mode, request.getRollingResultType());
        LocalDate reportedDate = request.getReportedDate();
        JobSelection jobSelection = resolveJobSelection(request.getJobCategoryId(), request.getOtherJobName(), company);
        if (company != null) {
            ensureCompanyJobCategory(company, jobSelection.jobCategory());
        }
        if (!isRollingMode(mode)) {
            validateRegularFields(prevStepName, currentStepName, request.getPrevReportedDate(), reportedDate);
        } else {
            validateRollingFields(prevStepName, currentStepName, request.getPrevReportedDate(), reportedDate, rollingResultType);
        }

        report.setCompany(company);
        report.setJobCategory(jobSelection.jobCategory());
        report.setOtherJobName(jobSelection.otherJobName());
        report.setJobReviewStatus(JobReviewStatus.PENDING);
        report.setJobReviewedAt(null);
        report.setCompanyName(companyName);
        report.setRecruitmentMode(mode);
        report.setRollingResultType(isRollingMode(mode) ? rollingResultType : null);
        report.setPrevReportedDate(
            !isRollingMode(mode)
                ? request.getPrevReportedDate()
                : mode == RecruitmentMode.ROLLING && rollingResultType == RollingReportType.DATE_REPORTED
                    ? request.getPrevReportedDate()
                    : null
        );
        report.setPrevStepName(
            mode == RecruitmentMode.ROLLING && rollingResultType == RollingReportType.NO_RESPONSE_REPORTED
                ? null
                : prevStepName
        );
        report.setCurrentStepName(currentStepName);
        report.setReportedDate(
            mode == RecruitmentMode.ROLLING && rollingResultType == RollingReportType.NO_RESPONSE_REPORTED
                ? null
                : reportedDate
        );
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem assignReportValues(Long reportId) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be assigned");
        }

        assignReportRelations(report);
        return toAdminItem(report);
    }

    @Transactional
    public int assignAllPendingReports() {
        List<StepDateReport> reports = reportRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(ReportStatus.PENDING);
        int updated = 0;
        for (StepDateReport report : reports) {
            if (assignReportRelations(report)) {
                updated += 1;
            }
        }
        return updated;
    }

    @Transactional
    public ReportAdminItem processReport(Long reportId) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be processed");
        }
        ensureProcessRelations(report);

        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            if (!isValidRollingReport(report)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rolling report data is invalid");
            }
            int reportCountToApply = report.getReportCount() == null ? 1 : Math.max(report.getReportCount(), 1);
            RollingReportType rollingResultType = report.getRollingResultType() == null
                ? RollingReportType.DATE_REPORTED
                : report.getRollingResultType();
            String rollingStepName = normalizeCurrentStepName(report.getCurrentStepName());
            String rollingPrevStepName = normalizeCurrentStepName(report.getPrevStepName());
            if (rollingStepName == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
            }
            String rollingCompanyName = canonicalCompanyName(normalizeCompanyName(report.getCompanyName()), report.getCompany());
            RollingJob rollingJob = null;
            if (report.getCompany() != null) {
                try {
                    rollingJob = resolveRollingJobSelection(null,
                        report.getJobCategory() == null ? null : report.getJobCategory().getJobCategoryId(),
                        report.getOtherJobName(),
                        report.getCompany());
                } catch (ResponseStatusException ignored) {
                    rollingJob = null;
                }
            }

            java.util.Optional<RollingStepLog> existing;
            if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                existing = rollingJob == null
                    ? rollingStepLogRepository.findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndRollingResultTypeAndSourceType(
                        rollingCompanyName,
                        RecruitmentMode.ROLLING,
                        rollingStepName,
                        RollingReportType.NO_RESPONSE_REPORTED,
                        LogSourceType.REPORT
                    )
                    : rollingStepLogRepository.findFirstByCompanyNameAndRollingJobAndRecruitmentModeAndCurrentStepNameAndRollingResultTypeAndSourceType(
                        rollingCompanyName,
                        rollingJob,
                        RecruitmentMode.ROLLING,
                        rollingStepName,
                        RollingReportType.NO_RESPONSE_REPORTED,
                        LogSourceType.REPORT
                    );
            } else {
                existing = rollingJob == null
                    ? rollingStepLogRepository
                        .findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndPrevStepNameAndRollingResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
                            rollingCompanyName,
                            RecruitmentMode.ROLLING,
                            rollingStepName,
                            rollingPrevStepName,
                            rollingResultType,
                            LogSourceType.REPORT,
                            report.getPrevReportedDate(),
                            report.getReportedDate()
                        )
                    : rollingStepLogRepository
                        .findFirstByCompanyNameAndRollingJobAndRecruitmentModeAndCurrentStepNameAndPrevStepNameAndRollingResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
                            rollingCompanyName,
                            rollingJob,
                            RecruitmentMode.ROLLING,
                            rollingStepName,
                            rollingPrevStepName,
                            rollingResultType,
                            LogSourceType.REPORT,
                            report.getPrevReportedDate(),
                            report.getReportedDate()
                        );
            }
            final RollingJob finalRollingJob = rollingJob;

            RollingStepLog rollingLog = existing.orElseGet(() -> {
                RollingStepLog created = new RollingStepLog();
                created.setCompany(report.getCompany());
                created.setRollingJob(finalRollingJob);
                created.setCompanyName(rollingCompanyName);
                created.setCurrentStepName(rollingStepName);
                created.setPrevStepName(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : rollingPrevStepName);
                created.setRollingResultType(rollingResultType);
                created.setRecruitmentMode(RecruitmentMode.ROLLING);
                created.setSourceType(LogSourceType.REPORT);
                created.setPrevReportedDate(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getPrevReportedDate());
                created.setReportedDate(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getReportedDate());
                created.setReportCount(reportCountToApply);
                return created;
            });
            if (existing.isPresent()) {
                int currentCount = rollingLog.getReportCount() == null ? 0 : rollingLog.getReportCount();
                if (rollingLog.getCompany() == null && report.getCompany() != null) {
                    rollingLog.setCompany(report.getCompany());
                }
                if (rollingLog.getRollingJob() == null && rollingJob != null) {
                    rollingLog.setRollingJob(rollingJob);
                }
                if (rollingLog.getCompanyName() == null || rollingLog.getCompanyName().isBlank()) {
                    rollingLog.setCompanyName(rollingCompanyName);
                }
                if (rollingLog.getCurrentStepName() == null || rollingLog.getCurrentStepName().isBlank()) {
                    rollingLog.setCurrentStepName(rollingStepName);
                }
                if (rollingResultType != RollingReportType.NO_RESPONSE_REPORTED
                    && (rollingLog.getPrevStepName() == null || rollingLog.getPrevStepName().isBlank())) {
                    rollingLog.setPrevStepName(rollingPrevStepName);
                }
                if (rollingLog.getSourceType() == null) {
                    rollingLog.setSourceType(LogSourceType.REPORT);
                }
                if (rollingLog.getRecruitmentMode() == null) {
                    rollingLog.setRecruitmentMode(RecruitmentMode.ROLLING);
                }
                if (rollingResultType != RollingReportType.NO_RESPONSE_REPORTED) {
                    if (rollingLog.getPrevReportedDate() == null) {
                        rollingLog.setPrevReportedDate(report.getPrevReportedDate());
                    }
                    if (rollingLog.getReportedDate() == null) {
                        rollingLog.setReportedDate(report.getReportedDate());
                    }
                }
                rollingLog.setReportCount(currentCount + reportCountToApply);
            }
            rollingStepLogRepository.save(rollingLog);
            report.setStatus(ReportStatus.PROCESSED);
            report.setDeletedAt(LocalDateTime.now());
            return toAdminItem(report);
        }

        if (isOnHold(report)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report is on hold");
        }

        // New regular flow: process regular reports as interval logs (same shape as rolling).
        if (isValidRegularReport(report)) {
            RecruitmentMode nonRollingMode = report.getRecruitmentMode() == null
                ? RecruitmentMode.REGULAR
                : report.getRecruitmentMode();
            int reportCountToApply = report.getReportCount() == null ? 1 : Math.max(report.getReportCount(), 1);
            RollingReportType nonRollingResultType =
                report.getReportedDate() == null ? RollingReportType.NO_RESPONSE_REPORTED : RollingReportType.DATE_REPORTED;

            String nonRollingCurrentStep = normalizeCurrentStepName(report.getCurrentStepName());
            String nonRollingPrevStep = normalizeCurrentStepName(report.getPrevStepName());
            if (nonRollingCurrentStep == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
            }
            final String finalNonRollingCurrentStep = nonRollingCurrentStep;
            final String finalNonRollingPrevStep = nonRollingPrevStep;
            String nonRollingCompanyName = canonicalCompanyName(normalizeCompanyName(report.getCompanyName()), report.getCompany());

            java.util.Optional<RecruitmentStepLog> existingRegular;
            if (nonRollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                existingRegular = recruitmentStepLogRepository.findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndResultTypeAndSourceType(
                    nonRollingCompanyName,
                    nonRollingMode,
                    finalNonRollingCurrentStep,
                    RollingReportType.NO_RESPONSE_REPORTED,
                    LogSourceType.REPORT
                );
            } else {
                existingRegular = recruitmentStepLogRepository
                    .findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndPrevStepNameAndResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
                        nonRollingCompanyName,
                        nonRollingMode,
                        finalNonRollingCurrentStep,
                        finalNonRollingPrevStep,
                        RollingReportType.DATE_REPORTED,
                        LogSourceType.REPORT,
                        report.getPrevReportedDate(),
                        report.getReportedDate()
                    );
            }

            RecruitmentStepLog regularLog = existingRegular.orElseGet(() -> {
                RecruitmentStepLog created = new RecruitmentStepLog();
                created.setCompany(report.getCompany());
                created.setCompanyName(nonRollingCompanyName);
                created.setCurrentStepName(finalNonRollingCurrentStep);
                created.setPrevStepName(nonRollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : finalNonRollingPrevStep);
                created.setResultType(nonRollingResultType);
                created.setRecruitmentMode(nonRollingMode);
                created.setSourceType(LogSourceType.REPORT);
                created.setPrevReportedDate(nonRollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getPrevReportedDate());
                created.setReportedDate(nonRollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getReportedDate());
                created.setReportCount(reportCountToApply);
                return created;
            });
            if (existingRegular.isPresent()) {
                int currentCount = regularLog.getReportCount() == null ? 0 : regularLog.getReportCount();
                if (regularLog.getCompany() == null && report.getCompany() != null) {
                    regularLog.setCompany(report.getCompany());
                }
                if (regularLog.getCompanyName() == null || regularLog.getCompanyName().isBlank()) {
                    regularLog.setCompanyName(nonRollingCompanyName);
                }
                if (regularLog.getCurrentStepName() == null || regularLog.getCurrentStepName().isBlank()) {
                    regularLog.setCurrentStepName(finalNonRollingCurrentStep);
                }
                if (nonRollingResultType != RollingReportType.NO_RESPONSE_REPORTED
                    && (regularLog.getPrevStepName() == null || regularLog.getPrevStepName().isBlank())) {
                    regularLog.setPrevStepName(finalNonRollingPrevStep);
                }
                if (regularLog.getSourceType() == null) {
                    regularLog.setSourceType(LogSourceType.REPORT);
                }
                if (regularLog.getResultType() == null) {
                    regularLog.setResultType(nonRollingResultType);
                }
                if (regularLog.getRecruitmentMode() == null) {
                    regularLog.setRecruitmentMode(nonRollingMode);
                }
                if (nonRollingResultType != RollingReportType.NO_RESPONSE_REPORTED) {
                    if (regularLog.getPrevReportedDate() == null) {
                        regularLog.setPrevReportedDate(report.getPrevReportedDate());
                    }
                    if (regularLog.getReportedDate() == null) {
                        regularLog.setReportedDate(report.getReportedDate());
                    }
                }
                regularLog.setReportCount(currentCount + reportCountToApply);
            }
            recruitmentStepLogRepository.save(regularLog);
            report.setStatus(ReportStatus.PROCESSED);
            report.setDeletedAt(LocalDateTime.now());
            return toAdminItem(report);
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Regular report data is invalid");
    }

    @Transactional
    public ReportAdminItem discardReport(Long reportId) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be discarded");
        }
        report.setStatus(ReportStatus.DISCARDED);
        report.setDeletedAt(LocalDateTime.now());
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem approveJobReview(Long reportId) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        report.setJobReviewStatus(JobReviewStatus.APPROVED);
        report.setJobReviewedAt(LocalDateTime.now());
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem rejectJobReview(Long reportId) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        report.setJobReviewStatus(JobReviewStatus.REJECTED);
        report.setJobReviewedAt(LocalDateTime.now());
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem mergeOtherJobCategory(Long reportId, Long targetJobCategoryId, ReportJobMergeRequest.MergeDecision decision) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        Company company = report.getCompany();
        if (company == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
            company = findCompany(report.getCompanyName().trim());
            if (company != null) {
                report.setCompany(company);
                report.setCompanyName(company.getCompanyName());
            }
        }
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required for merge");
        }
        String otherJobName = normalizeOtherJobName(report.getOtherJobName());
        if (otherJobName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only reports with custom job name can be merged");
        }

        JobCategory target = resolveJobCategoryById(targetJobCategoryId);
        if (isOtherJobCategory(target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Merge target cannot be OTHER category");
        }

        List<StepDateReport> candidates = reportRepository.findByCompanyAndStatusAndDeletedAtIsNull(company, ReportStatus.PENDING)
            .stream()
            .filter(candidate -> isSameNormalizedText(candidate.getOtherJobName(), otherJobName))
            .toList();
        for (StepDateReport candidate : candidates) {
            candidate.setJobCategory(target);
            candidate.setOtherJobName(null);
            candidate.setJobReviewStatus(JobReviewStatus.MERGED);
            candidate.setJobReviewedAt(LocalDateTime.now());
        }
        ReportJobMergeRequest.MergeDecision requestedDecision = decision == null ? ReportJobMergeRequest.MergeDecision.NONE : decision;
        if (requestedDecision == ReportJobMergeRequest.MergeDecision.PROCESS) {
            return processReport(reportId);
        }
        if (requestedDecision == ReportJobMergeRequest.MergeDecision.DISCARD) {
            return discardReport(reportId);
        }
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem updateRollingReport(Long reportId, ReportUpdateRequest request) {
        RollingReport report = rollingReportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be updated");
        }

        String requestedCompanyName = normalizeCompanyName(request.getCompanyName());
        Company company = findCompany(requestedCompanyName);
        String companyName = canonicalCompanyName(requestedCompanyName, company);
        String prevStepName = normalizeCurrentStepName(request.getPrevStepName());
        String currentStepName = normalizeCurrentStepName(request.getCurrentStepName());
        RollingReportType rollingResultType = resolveRollingResultType(RecruitmentMode.ROLLING, request.getRollingResultType());
        LocalDate reportedDate = request.getReportedDate();
        if (company == null) {
            Company created = new Company();
            created.setCompanyName(canonicalCompanyName(requestedCompanyName, null));
            created.setActive(true);
            company = companyRepository.save(created);
            companyName = company.getCompanyName();
        }
        RollingJob rollingJob = resolveRollingJobSelection(
            request.getRollingJobName(),
            request.getJobCategoryId(),
            request.getOtherJobName(),
            company
        );
        validateRollingFields(prevStepName, currentStepName, request.getPrevReportedDate(), reportedDate, rollingResultType);

        report.setCompany(company);
        report.setRollingJob(rollingJob);
        report.setJobCategory(null);
        report.setOtherJobName(rollingJob.getJobName());
        report.setJobReviewStatus(JobReviewStatus.PENDING);
        report.setJobReviewedAt(null);
        report.setCompanyName(companyName);
        report.setRollingResultType(rollingResultType);
        report.setPrevReportedDate(rollingResultType == RollingReportType.DATE_REPORTED ? request.getPrevReportedDate() : null);
        report.setPrevStepName(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : prevStepName);
        report.setCurrentStepName(currentStepName);
        report.setReportedDate(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : reportedDate);
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem assignRollingReportValues(Long reportId) {
        RollingReport report = rollingReportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be assigned");
        }
        assignRollingReportRelations(report);
        return toAdminItem(report);
    }

    @Transactional
    public int assignAllPendingRollingReports() {
        List<RollingReport> reports = rollingReportRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(ReportStatus.PENDING);
        int updated = 0;
        for (RollingReport report : reports) {
            if (assignRollingReportRelations(report)) {
                updated += 1;
            }
        }
        return updated;
    }

    @Transactional
    public ReportAdminItem processRollingReport(Long reportId) {
        RollingReport report = rollingReportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be processed");
        }
        ensureProcessRelationsForRolling(report);
        if (!isValidRollingReport(report)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rolling report data is invalid");
        }
        int reportCountToApply = report.getReportCount() == null ? 1 : Math.max(report.getReportCount(), 1);
        RollingReportType rollingResultType = report.getRollingResultType() == null
            ? RollingReportType.DATE_REPORTED
            : report.getRollingResultType();
        RollingJob rollingJob = report.getRollingJob();
        if (rollingJob == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rolling job is required");
        }
        String rollingStepName = normalizeCurrentStepName(report.getCurrentStepName());
        String rollingPrevStepName = normalizeCurrentStepName(report.getPrevStepName());
        if (rollingStepName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
        }
        String rollingCompanyName = canonicalCompanyName(normalizeCompanyName(report.getCompanyName()), report.getCompany());

        Optional<RollingStepLog> existing;
        if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
            existing = rollingStepLogRepository.findFirstByCompanyNameAndRollingJobAndRecruitmentModeAndCurrentStepNameAndRollingResultTypeAndSourceType(
                rollingCompanyName,
                rollingJob,
                RecruitmentMode.ROLLING,
                rollingStepName,
                RollingReportType.NO_RESPONSE_REPORTED,
                LogSourceType.REPORT
            );
        } else {
            existing = rollingStepLogRepository
                .findFirstByCompanyNameAndRollingJobAndRecruitmentModeAndCurrentStepNameAndPrevStepNameAndRollingResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
                    rollingCompanyName,
                    rollingJob,
                    RecruitmentMode.ROLLING,
                    rollingStepName,
                    rollingPrevStepName,
                    rollingResultType,
                    LogSourceType.REPORT,
                    report.getPrevReportedDate(),
                    report.getReportedDate()
                );
        }

        RollingStepLog rollingLog = existing.orElseGet(() -> {
            RollingStepLog created = new RollingStepLog();
            created.setCompany(report.getCompany());
            created.setRollingJob(rollingJob);
            created.setCompanyName(rollingCompanyName);
            created.setCurrentStepName(rollingStepName);
            created.setPrevStepName(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : rollingPrevStepName);
            created.setRollingResultType(rollingResultType);
            created.setRecruitmentMode(RecruitmentMode.ROLLING);
            created.setSourceType(LogSourceType.REPORT);
            created.setPrevReportedDate(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getPrevReportedDate());
            created.setReportedDate(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getReportedDate());
            created.setReportCount(reportCountToApply);
            return created;
        });
        if (existing.isPresent()) {
            int currentCount = rollingLog.getReportCount() == null ? 0 : rollingLog.getReportCount();
            if (rollingLog.getCompany() == null && report.getCompany() != null) {
                rollingLog.setCompany(report.getCompany());
            }
            if (rollingLog.getRollingJob() == null) {
                rollingLog.setRollingJob(rollingJob);
            }
            if (rollingLog.getCompanyName() == null || rollingLog.getCompanyName().isBlank()) {
                rollingLog.setCompanyName(rollingCompanyName);
            }
            if (rollingLog.getCurrentStepName() == null || rollingLog.getCurrentStepName().isBlank()) {
                rollingLog.setCurrentStepName(rollingStepName);
            }
            if (rollingResultType != RollingReportType.NO_RESPONSE_REPORTED
                && (rollingLog.getPrevStepName() == null || rollingLog.getPrevStepName().isBlank())) {
                rollingLog.setPrevStepName(rollingPrevStepName);
            }
            if (rollingLog.getSourceType() == null) {
                rollingLog.setSourceType(LogSourceType.REPORT);
            }
            if (rollingLog.getRecruitmentMode() == null) {
                rollingLog.setRecruitmentMode(RecruitmentMode.ROLLING);
            }
            if (rollingResultType != RollingReportType.NO_RESPONSE_REPORTED) {
                if (rollingLog.getPrevReportedDate() == null) {
                    rollingLog.setPrevReportedDate(report.getPrevReportedDate());
                }
                if (rollingLog.getReportedDate() == null) {
                    rollingLog.setReportedDate(report.getReportedDate());
                }
            }
            rollingLog.setReportCount(currentCount + reportCountToApply);
        }
        rollingStepLogRepository.save(rollingLog);
        report.setStatus(ReportStatus.PROCESSED);
        report.setDeletedAt(LocalDateTime.now());
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem discardRollingReport(Long reportId) {
        RollingReport report = rollingReportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be discarded");
        }
        report.setStatus(ReportStatus.DISCARDED);
        report.setDeletedAt(LocalDateTime.now());
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem approveRollingJobReview(Long reportId) {
        RollingReport report = rollingReportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        report.setJobReviewStatus(JobReviewStatus.APPROVED);
        report.setJobReviewedAt(LocalDateTime.now());
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem rejectRollingJobReview(Long reportId) {
        RollingReport report = rollingReportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        report.setJobReviewStatus(JobReviewStatus.REJECTED);
        report.setJobReviewedAt(LocalDateTime.now());
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem mergeRollingOtherJobCategory(Long reportId, Long targetJobCategoryId, ReportJobMergeRequest.MergeDecision decision) {
        RollingReport report = rollingReportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        Company company = report.getCompany();
        if (company == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
            company = findCompany(report.getCompanyName().trim());
            if (company != null) {
                report.setCompany(company);
                report.setCompanyName(company.getCompanyName());
            }
        }
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required for merge");
        }
        String otherJobName = normalizeOtherJobName(report.getOtherJobName());
        if (otherJobName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only reports with custom job name can be merged");
        }
        JobCategory target = resolveJobCategoryById(targetJobCategoryId);
        if (isOtherJobCategory(target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Merge target cannot be OTHER category");
        }

        List<RollingReport> candidates = rollingReportRepository.findByCompanyAndStatusAndDeletedAtIsNull(company, ReportStatus.PENDING)
            .stream()
            .filter(candidate -> isSameNormalizedText(candidate.getOtherJobName(), otherJobName))
            .toList();
        for (RollingReport candidate : candidates) {
            candidate.setJobCategory(target);
            candidate.setOtherJobName(null);
            candidate.setJobReviewStatus(JobReviewStatus.MERGED);
            candidate.setJobReviewedAt(LocalDateTime.now());
        }
        ReportJobMergeRequest.MergeDecision requestedDecision = decision == null ? ReportJobMergeRequest.MergeDecision.NONE : decision;
        if (requestedDecision == ReportJobMergeRequest.MergeDecision.PROCESS) {
            return processRollingReport(reportId);
        }
        if (requestedDecision == ReportJobMergeRequest.MergeDecision.DISCARD) {
            return discardRollingReport(reportId);
        }
        return toAdminItem(report);
    }

    private ReportAdminItem toAdminItem(StepDateReport report) {
        Long jobCategoryId = report.getJobCategory() == null ? null : report.getJobCategory().getJobCategoryId();
        String jobCategoryName = report.getJobCategory() == null ? null : report.getJobCategory().getName();
        InterviewReview latestReview = interviewReviewRepository
            .findTopByReportReportIdAndIsActiveTrueOrderByCreatedAtDesc(report.getReportId())
            .orElse(null);
        return new ReportAdminItem(
            report.getReportId(),
            report.getReportCount(),
            report.getCompanyName(),
            report.getRecruitmentMode(),
            report.getRollingResultType(),
            report.getPrevReportedDate(),
            report.getPrevStepName(),
            report.getCurrentStepName(),
            report.getReportedDate(),
            report.getStatus(),
            jobCategoryId,
            jobCategoryName,
            report.getOtherJobName(),
            report.getJobReviewStatus(),
            latestReview == null ? null : latestReview.getContent(),
            latestReview == null ? null : latestReview.getDifficulty(),
            isOnHold(report)
        );
    }

    private ReportAdminItem toAdminItem(RollingReport report) {
        Long jobCategoryId = report.getRollingJob() == null ? null : report.getRollingJob().getRollingJobId();
        String jobCategoryName = report.getRollingJob() == null ? null : report.getRollingJob().getJobName();
        InterviewReview latestReview = interviewReviewRepository
            .findTopByRollingReportReportIdAndIsActiveTrueOrderByCreatedAtDesc(report.getReportId())
            .orElse(null);
        return new ReportAdminItem(
            report.getReportId(),
            report.getReportCount(),
            report.getCompanyName(),
            RecruitmentMode.ROLLING,
            report.getRollingResultType(),
            report.getPrevReportedDate(),
            report.getPrevStepName(),
            report.getCurrentStepName(),
            report.getReportedDate(),
            report.getStatus(),
            jobCategoryId,
            jobCategoryName,
            report.getRollingJob() == null ? report.getOtherJobName() : report.getRollingJob().getJobName(),
            report.getJobReviewStatus(),
            latestReview == null ? null : latestReview.getContent(),
            latestReview == null ? null : latestReview.getDifficulty(),
            isOnHold(report)
        );
    }

    private boolean isOnHold(StepDateReport report) {
        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            return !isValidRollingReport(report);
        }
        return !isValidRegularReport(report);
    }

    private boolean isOnHold(RollingReport report) {
        return !isValidRollingReport(report);
    }

    private RecruitmentChannel resolveChannelForReport(StepDateReport report) {
        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            return null;
        }
        if (report.getCompany() == null) {
            return null;
        }
        JobCategory jobCategory = report.getJobCategory();
        if (jobCategory == null) {
            return null;
        }
        List<RecruitmentChannel> channels = channelRepository.findActiveByCompanyIdAndJobCategoryId(
            report.getCompany().getCompanyId(),
            jobCategory.getJobCategoryId()
        );
        return channels.isEmpty() ? null : channels.get(0);
    }

    private String normalizeCompanyName(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }
        return raw.trim();
    }

    private Company findCompany(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return null;
        }
        Company exact = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName).orElse(null);
        if (exact != null) {
            return exact;
        }
        String normalizedKey = normalizeCompanyKey(companyName);
        if (normalizedKey.isBlank()) {
            return null;
        }
        return companyRepository.findAll().stream()
            .filter(Company::isActive)
            .filter(candidate -> normalizeCompanyKey(candidate.getCompanyName()).equals(normalizedKey))
            .findFirst()
            .orElse(null);
    }

    private String canonicalCompanyName(String requestedName, Company matchedCompany) {
        if (matchedCompany != null && matchedCompany.getCompanyName() != null && !matchedCompany.getCompanyName().isBlank()) {
            return matchedCompany.getCompanyName().trim();
        }
        return normalizeCompanyDisplayName(requestedName);
    }

    private String normalizeCurrentStepName(String raw) {
        String normalized = StepTextNormalizer.normalizeDisplay(raw);
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeOtherJobName(String raw) {
        String normalized = StepTextNormalizer.normalizeDisplay(raw);
        return normalized.isBlank() ? null : normalized;
    }

    private JobSelection resolveJobSelection(Long jobCategoryId, String otherJobNameRaw, Company company) {
        JobCategory requestedCategory = resolveJobCategoryById(jobCategoryId);
        String normalizedOtherJobName = normalizeOtherJobName(otherJobNameRaw);

        if (isOtherJobCategory(requestedCategory)) {
            if (normalizedOtherJobName == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "otherJobName is required for OTHER category");
            }
            if (normalizedOtherJobName.length() > 20) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "otherJobName must be 20 characters or less");
            }

            JobCategory matched = findActiveJobCategoryByNormalizedName(normalizedOtherJobName);
            if (matched != null && !isOtherJobCategory(matched)) {
                if (company != null) {
                    ensureCompanyJobCategory(company, matched);
                }
                return new JobSelection(matched, null);
            }

            JobCategory created = new JobCategory();
            created.setName(normalizedOtherJobName);
            created.setActive(true);
            JobCategory saved = jobCategoryRepository.save(created);
            if (company != null) {
                ensureCompanyJobCategory(company, saved);
            }
            return new JobSelection(saved, null);
        } else if (normalizedOtherJobName != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "otherJobName is only allowed for OTHER category");
        }

        if (company != null) {
            ensureCompanyJobCategory(company, requestedCategory);
        }
        return new JobSelection(requestedCategory, null);
    }

    private RollingJob resolveRollingJobSelection(String rollingJobNameRaw,
                                                  Long fallbackJobCategoryId,
                                                  String fallbackOtherJobNameRaw,
                                                  Company company) {
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required for rolling job");
        }
        String candidateName = normalizeOtherJobName(rollingJobNameRaw);
        if (candidateName == null) {
            candidateName = normalizeOtherJobName(fallbackOtherJobNameRaw);
        }
        if (candidateName == null && fallbackJobCategoryId != null) {
            JobCategory fallbackCategory = resolveJobCategoryById(fallbackJobCategoryId);
            candidateName = normalizeOtherJobName(fallbackCategory.getName());
        }
        if (candidateName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rollingJobName is required for rolling reports");
        }
        if (candidateName.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rollingJobName must be 100 characters or less");
        }
        String normalizedKey = normalizeKeyword(candidateName);
        final String finalCandidateName = candidateName;
        return rollingJobRepository.findByCompanyAndNormalizedJobNameAndIsActiveTrue(company, normalizedKey)
            .orElseGet(() -> {
                RollingJob created = new RollingJob();
                created.setCompany(company);
                created.setJobName(finalCandidateName);
                created.setNormalizedJobName(normalizedKey);
                created.setActive(true);
                return rollingJobRepository.save(created);
            });
    }

    private JobCategory resolveJobCategoryById(Long jobCategoryId) {
        if (jobCategoryId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "jobCategoryId is required");
        }
        return jobCategoryRepository.findByJobCategoryIdAndIsActiveTrue(jobCategoryId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid job category id"));
    }

    private JobCategory findActiveJobCategoryByNormalizedName(String name) {
        String targetKey = normalizeKeyword(name);
        if (targetKey.isBlank()) {
            return null;
        }
        return jobCategoryRepository.findByIsActiveTrueOrderByJobCategoryIdAsc().stream()
            .filter(category -> !isOtherJobCategory(category))
            .filter(category -> normalizeKeyword(category.getName()).equals(targetKey))
            .findFirst()
            .orElse(null);
    }

    private StepDateReport findPendingDuplicateReport(String companyName,
                                                      RecruitmentMode mode,
                                                      RollingReportType rollingResultType,
                                                      String prevStepName,
                                                      String currentStepName,
                                                      LocalDate prevReportedDate,
                                                      LocalDate reportedDate,
                                                      JobCategory jobCategory,
                                                      String otherJobName) {
        List<StepDateReport> candidates = reportRepository.findByCompanyNameIgnoreCaseAndRecruitmentModeAndStatusAndDeletedAtIsNull(
            companyName,
            mode,
            ReportStatus.PENDING
        );
        for (StepDateReport candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            if (candidate.getRecruitmentMode() != mode) {
                continue;
            }
            if (candidate.getRollingResultType() != rollingResultType) {
                continue;
            }
            if (!isSameDate(candidate.getPrevReportedDate(), prevReportedDate)) {
                continue;
            }
            if (!isSameDate(candidate.getReportedDate(), reportedDate)) {
                continue;
            }
            if (!isSameNormalizedText(candidate.getPrevStepName(), prevStepName)) {
                continue;
            }
            if (!isSameNormalizedText(candidate.getCurrentStepName(), currentStepName)) {
                continue;
            }
            Long candidateJobCategoryId = candidate.getJobCategory() == null ? null : candidate.getJobCategory().getJobCategoryId();
            Long requestedJobCategoryId = jobCategory == null ? null : jobCategory.getJobCategoryId();
            if (!isSameId(candidateJobCategoryId, requestedJobCategoryId)) {
                continue;
            }
            if (!isSameNormalizedText(candidate.getOtherJobName(), otherJobName)) {
                continue;
            }
            return candidate;
        }
        return null;
    }

    private RollingReport findPendingDuplicateRollingReport(String companyName,
                                                            RollingReportType rollingResultType,
                                                            String prevStepName,
                                                            String currentStepName,
                                                            LocalDate prevReportedDate,
                                                            LocalDate reportedDate,
                                                            RollingJob rollingJob) {
        List<RollingReport> candidates = rollingReportRepository.findByCompanyNameIgnoreCaseAndStatusAndDeletedAtIsNull(
            companyName,
            ReportStatus.PENDING
        );
        for (RollingReport candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            if (candidate.getRollingResultType() != rollingResultType) {
                continue;
            }
            if (!isSameDate(candidate.getPrevReportedDate(), prevReportedDate)) {
                continue;
            }
            if (!isSameDate(candidate.getReportedDate(), reportedDate)) {
                continue;
            }
            if (!isSameNormalizedText(candidate.getPrevStepName(), prevStepName)) {
                continue;
            }
            if (!isSameNormalizedText(candidate.getCurrentStepName(), currentStepName)) {
                continue;
            }
            Long candidateRollingJobId = candidate.getRollingJob() == null ? null : candidate.getRollingJob().getRollingJobId();
            Long requestedRollingJobId = rollingJob == null ? null : rollingJob.getRollingJobId();
            if (!isSameId(candidateRollingJobId, requestedRollingJobId)) {
                continue;
            }
            return candidate;
        }
        return null;
    }

    private boolean isSameDate(LocalDate left, LocalDate right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return left.isEqual(right);
    }

    private boolean isSameId(Long left, Long right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return left.equals(right);
    }

    private boolean isSameNormalizedText(String left, String right) {
        return normalizeKeyword(left).equals(normalizeKeyword(right));
    }

    private void addSuggestion(Map<String, String> suggestions, String stepName) {
        String normalized = normalizeCurrentStepName(stepName);
        if (normalized == null) {
            return;
        }
        suggestions.putIfAbsent(normalizeKeyword(normalized), normalized);
    }

    private void validateRegularFields(String prevStepName,
                                       String currentStepName,
                                       LocalDate prevReportedDate,
                                       LocalDate reportedDate) {
        if (reportedDate != null && (currentStepName == null || currentStepName.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
        }
        if (currentStepName == null || currentStepName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
        }
        if (reportedDate != null && (prevStepName == null || prevStepName.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Previous step name is required");
        }
        if (reportedDate != null && prevReportedDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Previous reported date is required");
        }
        if (reportedDate != null && reportedDate.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date cannot be in the future");
        }
        if (prevReportedDate != null && reportedDate != null && !prevReportedDate.isBefore(reportedDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date must be after previous date");
        }
    }

    private void validateRollingFields(String prevStepName,
                                       String currentStepName,
                                       LocalDate prevReportedDate,
                                       LocalDate reportedDate,
                                       RollingReportType rollingResultType) {
        if (currentStepName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
        }
        if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
            return;
        }
        if (prevStepName == null || prevStepName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Previous step name is required");
        }
        if (prevReportedDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Previous reported date is required");
        }
        if (reportedDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date is required");
        }
        if (reportedDate.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date cannot be in the future");
        }
        long diff = java.time.temporal.ChronoUnit.DAYS.between(prevReportedDate, reportedDate);
        if (diff <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date must be after previous date");
        }
        if (diff > appProperties.getReport().getRollingMaxDiffDays()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rolling report range cannot exceed 3 months");
        }
    }

    private boolean isValidRollingReport(StepDateReport report) {
        if (report == null) {
            return false;
        }
        RollingReportType rollingResultType = report.getRollingResultType() == null
            ? RollingReportType.DATE_REPORTED
            : report.getRollingResultType();
        if (report.getCurrentStepName() == null || report.getCurrentStepName().isBlank()) {
            return false;
        }
        if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
            return true;
        }
        if (report.getPrevStepName() == null || report.getPrevStepName().isBlank()) {
            return false;
        }
        if (report.getPrevReportedDate() == null || report.getReportedDate() == null) {
            return false;
        }
        long diff = java.time.temporal.ChronoUnit.DAYS.between(report.getPrevReportedDate(), report.getReportedDate());
        return diff >= 0 && diff <= appProperties.getReport().getRollingMaxDiffDays();
    }

    private boolean isValidRollingReport(RollingReport report) {
        if (report == null) {
            return false;
        }
        RollingReportType rollingResultType = report.getRollingResultType() == null
            ? RollingReportType.DATE_REPORTED
            : report.getRollingResultType();
        if (report.getCurrentStepName() == null || report.getCurrentStepName().isBlank()) {
            return false;
        }
        if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
            return true;
        }
        if (report.getPrevStepName() == null || report.getPrevStepName().isBlank()) {
            return false;
        }
        if (report.getPrevReportedDate() == null || report.getReportedDate() == null) {
            return false;
        }
        long diff = java.time.temporal.ChronoUnit.DAYS.between(report.getPrevReportedDate(), report.getReportedDate());
        return diff >= 0 && diff <= appProperties.getReport().getRollingMaxDiffDays();
    }

    private boolean isValidRegularReport(StepDateReport report) {
        if (report == null) {
            return false;
        }
        String currentStepName = normalizeCurrentStepName(report.getCurrentStepName());
        if (currentStepName == null) {
            return false;
        }
        LocalDate prevDate = report.getPrevReportedDate();
        LocalDate currentDate = report.getReportedDate();
        if (prevDate == null && currentDate == null) {
            // no-response report: current step only
            return true;
        }
        String prevStepName = normalizeCurrentStepName(report.getPrevStepName());
        if (prevStepName == null) {
            return false;
        }
        if (prevDate == null || currentDate == null) {
            return false;
        }
        long diff = java.time.temporal.ChronoUnit.DAYS.between(prevDate, currentDate);
        return diff > 0;
    }

    private RollingReportType resolveRollingResultType(RecruitmentMode mode, RollingReportType requested) {
        if (!isRollingMode(mode)) {
            return null;
        }
        return requested == null ? RollingReportType.DATE_REPORTED : requested;
    }

    private boolean assignReportRelations(StepDateReport report) {
        boolean changed = false;
        if (isRollingMode(report.getRecruitmentMode())) {
            Company rollingCompany = report.getCompany();
            if (rollingCompany == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
                rollingCompany = findCompany(report.getCompanyName().trim());
                if (rollingCompany != null) {
                    report.setCompany(rollingCompany);
                    report.setCompanyName(rollingCompany.getCompanyName());
                    changed = true;
                }
            }
            if (report.getJobCategory() == null) {
                return changed;
            }
            return changed;
        }

        Company company = report.getCompany();
        if (company == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
            String requestedCompanyName = normalizeCompanyName(report.getCompanyName().trim());
            company = findCompany(requestedCompanyName);
            if (company == null) {
                Company created = new Company();
                created.setCompanyName(canonicalCompanyName(requestedCompanyName, null));
                created.setActive(true);
                company = companyRepository.save(created);
            }
            report.setCompany(company);
            report.setCompanyName(company.getCompanyName());
            changed = true;
        }
        if (report.getJobCategory() == null) {
            return changed;
        }
        return changed;
    }

    private boolean assignRollingReportRelations(RollingReport report) {
        boolean changed = false;
        Company company = report.getCompany();
        if (company == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
            company = findCompany(report.getCompanyName().trim());
            if (company != null) {
                report.setCompany(company);
                report.setCompanyName(company.getCompanyName());
                changed = true;
            }
        }
        return changed;
    }

    private void ensureProcessRelations(StepDateReport report) {
        if (report == null) {
            return;
        }
        String requestedCompanyName = normalizeCompanyName(report.getCompanyName());
        Company company = report.getCompany();
        if (company == null) {
            company = findCompany(requestedCompanyName);
        }
        if (company == null) {
            Company created = new Company();
            created.setCompanyName(canonicalCompanyName(requestedCompanyName, null));
            created.setActive(true);
            company = companyRepository.save(created);
        }
        report.setCompany(company);
        report.setCompanyName(company.getCompanyName());
        if (report.getJobCategory() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job category is required");
        }
        RecruitmentChannel channel = ensureActiveChannel(company, report.getJobCategory());
        List<RecruitmentStep> steps = stepRepository.findByChannelId(channel.getChannelId());
        ensureStepExists(channel, steps, report.getCurrentStepName());
        ensureStepPairExists(channel.getCompanyJobCategory(), report.getPrevStepName(), report.getCurrentStepName());
    }

    private void ensureProcessRelationsForRolling(RollingReport report) {
        if (report == null) {
            return;
        }
        String requestedCompanyName = normalizeCompanyName(report.getCompanyName());
        Company company = report.getCompany();
        if (company == null) {
            company = findCompany(requestedCompanyName);
        }
        if (company == null) {
            Company created = new Company();
            created.setCompanyName(canonicalCompanyName(requestedCompanyName, null));
            created.setActive(true);
            company = companyRepository.save(created);
        }
        report.setCompany(company);
        report.setCompanyName(company.getCompanyName());
        if (report.getRollingJob() == null) {
            report.setRollingJob(resolveRollingJobSelection(
                null,
                report.getJobCategory() == null ? null : report.getJobCategory().getJobCategoryId(),
                report.getOtherJobName(),
                company
            ));
        }
        JobCategory category = report.getJobCategory();
        if (category == null) {
            category = jobCategoryRepository.findByIsActiveTrueOrderByJobCategoryIdAsc().stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job category is required"));
            report.setJobCategory(category);
        }
        CompanyJobCategory companyJobCategory = ensureCompanyJobCategory(company, category);
        ensureStepPairExists(companyJobCategory, report.getPrevStepName(), report.getCurrentStepName());
    }

    private RecruitmentChannel ensureActiveChannel(Company company, JobCategory jobCategory) {
        if (company == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required");
        }
        if (jobCategory == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Job category is required");
        }
        CompanyJobCategory companyJobCategory = ensureCompanyJobCategory(company, jobCategory);
        List<RecruitmentChannel> channels = channelRepository.findActiveByCompanyJobCategoryId(companyJobCategory.getCompanyJobCategoryId());
        if (!channels.isEmpty()) {
            return channels.get(0);
        }
        RecruitmentChannel created = new RecruitmentChannel();
        created.setCompanyJobCategory(companyJobCategory);
        created.setYear(LocalDate.now().getYear());
        created.setActive(true);
        return channelRepository.save(created);
    }

    private CompanyJobCategory ensureCompanyJobCategory(Company company, JobCategory jobCategory) {
        return companyJobCategoryRepository.findByCompanyAndJobCategoryAndIsActiveTrue(company, jobCategory)
            .orElseGet(() -> {
                CompanyJobCategory created = new CompanyJobCategory();
                created.setCompany(company);
                created.setJobCategory(jobCategory);
                created.setActive(true);
                return companyJobCategoryRepository.save(created);
            });
    }

    private RecruitmentStep ensureStepExists(RecruitmentChannel channel,
                                             List<RecruitmentStep> existingSteps,
                                             String stepNameRaw) {
        String stepName = normalizeCurrentStepName(stepNameRaw);
        if (stepName == null) {
            return null;
        }
        RecruitmentStepMaster stepMaster = ensureStepMaster(stepName, StepKind.CURRENT);
        String normalized = normalizeKeyword(stepName);
        for (RecruitmentStep step : existingSteps) {
            if (step == null || step.getStepMaster() == null || step.getStepMaster().getStepName() == null) {
                continue;
            }
            if (normalizeKeyword(step.getStepMaster().getStepName()).equals(normalized)) {
                return step;
            }
        }

        RecruitmentStep created = new RecruitmentStep();
        created.setChannel(channel);
        created.setStepMaster(stepMaster);
        RecruitmentStep saved = stepRepository.save(created);
        existingSteps.add(saved);
        return saved;
    }

    private RecruitmentStepMaster ensureStepMaster(String stepNameRaw) {
        return ensureStepMaster(stepNameRaw, StepKind.BOTH);
    }

    private RecruitmentStepMaster ensureStepMaster(String stepNameRaw, StepKind desiredKind) {
        String stepName = normalizeCurrentStepName(stepNameRaw);
        if (stepName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step name is required");
        }
        RecruitmentStepMaster existing = findActiveMasterByStepName(stepName);
        if (existing != null) {
            RecruitmentStepMaster master = existing;
            if (desiredKind != null
                && desiredKind != StepKind.BOTH
                && master.getStepKind() != StepKind.BOTH
                && master.getStepKind() != desiredKind) {
                master.setStepKind(StepKind.BOTH);
                return stepMasterRepository.save(master);
            }
            return master;
        }
        RecruitmentStepMaster created = new RecruitmentStepMaster();
        created.setStepName(stepName);
        created.setStepKind(desiredKind == null ? StepKind.BOTH : desiredKind);
        created.setActive(true);
        return stepMasterRepository.save(created);
    }

    private RecruitmentStepMaster findActiveMasterByStepName(String stepName) {
        String targetKey = normalizeKeyword(stepName);
        if (targetKey.isBlank()) {
            return null;
        }
        return stepMasterRepository.findByIsActiveTrueOrderByStepMasterIdAsc().stream()
            .filter(master -> normalizeKeyword(master == null ? null : master.getStepName()).equals(targetKey))
            .findFirst()
            .orElse(null);
    }
    private void ensureStepPairExists(CompanyJobCategory companyJobCategory,
                                      String prevStepNameRaw,
                                      String currentStepNameRaw) {
        if (companyJobCategory == null) {
            return;
        }
        String prevStepName = normalizeCurrentStepName(prevStepNameRaw);
        String currentStepName = normalizeCurrentStepName(currentStepNameRaw);
        if (prevStepName == null || currentStepName == null) {
            return;
        }

        RecruitmentStepMaster prevMaster = ensureStepMaster(prevStepName, StepKind.PREV);
        RecruitmentStepMaster currentMaster = ensureStepMaster(currentStepName, StepKind.CURRENT);

        if (stepPairRepository
            .findFirstByCompanyJobCategoryAndPrevStepMasterAndCurrentStepMasterAndIsActiveTrue(
                companyJobCategory,
                prevMaster,
                currentMaster
            )
            .isPresent()) {
            return;
        }

        Optional<RecruitmentStepPair> existing = stepPairRepository
            .findFirstByCompanyJobCategoryAndPrevStepMasterAndCurrentStepMaster(
                companyJobCategory,
                prevMaster,
                currentMaster
            );
        if (existing.isPresent()) {
            RecruitmentStepPair pair = existing.get();
            if (!pair.isActive()) {
                pair.setActive(true);
                stepPairRepository.save(pair);
            }
            return;
        }

        RecruitmentStepPair created = new RecruitmentStepPair();
        created.setCompanyJobCategory(companyJobCategory);
        created.setPrevStepMaster(prevMaster);
        created.setCurrentStepMaster(currentMaster);
        created.setActive(true);
        stepPairRepository.save(created);
    }
    private boolean isOtherJobCategory(JobCategory category) {
        if (category == null || category.getName() == null) {
            return false;
        }
        return normalizeKeyword(category.getName()).equals(normalizeKeyword("기타"));
    }

    private List<ReportStepResponse> stepsForChannel(RecruitmentChannel channel) {
        if (channel == null) {
            return List.of();
        }
        return stepRepository.findByChannelId(channel.getChannelId()).stream()
            .map(step -> new ReportStepResponse(step.getStepId(), step.getStepName()))
            .toList();
    }

    private void enforceCooldown(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return;
        }
        long now = System.currentTimeMillis();
        long reportCooldownMs = appProperties.getReport().getCooldownMs();
        Long last = lastReportAtByIp.put(clientIp, now);
        if (last != null && now - last < reportCooldownMs) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many reports");
        }
        lastReportAtByIp.entrySet().removeIf(entry -> now - entry.getValue() > reportCooldownMs * 10);
    }

    private String normalizeKeyword(String value) {
        return StepTextNormalizer.normalizeKey(value);
    }

    private String normalizeCompanyDisplayName(String value) {
        String normalized = CompanyNameNormalizer.normalizeForDisplay(value);
        if (!normalized.isBlank()) {
            return normalized;
        }
        return value == null ? "" : value.trim();
    }

    private String normalizeCompanyKey(String value) {
        return CompanyNameNormalizer.normalizeKey(value);
    }

    private boolean isRollingMode(RecruitmentMode mode) {
        return mode == RecruitmentMode.ROLLING;
    }

    private record JobSelection(JobCategory jobCategory, String otherJobName) {}
}




