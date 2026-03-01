package com.whennawa.service;

import com.whennawa.config.AppProperties;
import com.whennawa.dto.report.ReportAdminItem;
import com.whennawa.dto.report.ReportCreateRequest;
import com.whennawa.dto.report.ReportCreateResponse;
import com.whennawa.dto.report.ReportStepResponse;
import com.whennawa.dto.report.ReportUpdateRequest;
import com.whennawa.entity.Company;
import com.whennawa.entity.RecruitmentChannel;
import com.whennawa.entity.RecruitmentStep;
import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.enums.LogSourceType;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.RecruitmentChannelRepository;
import com.whennawa.repository.RecruitmentStepRepository;
import com.whennawa.repository.RollingStepLogRepository;
import com.whennawa.repository.StepDateReportRepository;
import com.whennawa.util.CompanyNameNormalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final RecruitmentChannelRepository channelRepository;
    private final RecruitmentStepRepository stepRepository;
    private final StepDateReportRepository reportRepository;
    private final RollingStepLogRepository rollingStepLogRepository;
    private final NotificationService notificationService;
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

        StepDateReport duplicate = null;
        if (mode == RecruitmentMode.REGULAR) {
            validateRegularFields(prevStepName, currentStepName, prevReportedDate, reportedDate);
            if (currentStepName != null) {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndReportedDateAndPrevStepNameAndCurrentStepNameAndStatusAndDeletedAtIsNull(
                        companyName,
                        reportedDate,
                        prevStepName,
                        currentStepName,
                        ReportStatus.PENDING
                    )
                    .orElse(null);
            }
        } else {
            validateRollingFields(prevStepName, currentStepName, prevReportedDate, reportedDate, rollingResultType);
            if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndPrevStepNameAndCurrentStepNameAndStatusAndDeletedAtIsNull(
                        companyName,
                        RecruitmentMode.ROLLING,
                        RollingReportType.NO_RESPONSE_REPORTED,
                        null,
                        currentStepName,
                        ReportStatus.PENDING
                    )
                    .orElse(null);
            } else {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndPrevStepNameAndCurrentStepNameAndPrevReportedDateAndReportedDateAndStatusAndDeletedAtIsNull(
                        companyName,
                        RecruitmentMode.ROLLING,
                        rollingResultType,
                        prevStepName,
                        currentStepName,
                        prevReportedDate,
                        reportedDate,
                        ReportStatus.PENDING
                    )
                    .orElse(null);
            }
        }

        if (duplicate != null) {
            int current = duplicate.getReportCount() == null ? 0 : duplicate.getReportCount();
            duplicate.setReportCount(current + 1);
            if (mode == RecruitmentMode.REGULAR) {
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
            }
            reportRepository.save(duplicate);
            if (mode == RecruitmentMode.REGULAR && Boolean.TRUE.equals(request.getTodayAnnouncement())) {
                notificationService.onRegularTodayReport(company, reportedDate, reporterUserId, request.getNotificationMessage());
            }
            return new ReportCreateResponse(duplicate.getReportId());
        }

        StepDateReport report = new StepDateReport();
        report.setCompany(company);
        report.setCompanyName(companyName);
        report.setRecruitmentMode(mode);
        report.setRollingResultType(mode == RecruitmentMode.ROLLING ? rollingResultType : null);
        report.setPrevReportedDate(
            mode == RecruitmentMode.REGULAR
                ? prevReportedDate
                : mode == RecruitmentMode.ROLLING && rollingResultType == RollingReportType.DATE_REPORTED
                    ? prevReportedDate
                    : null
        );
        report.setPrevStepName(
            mode == RecruitmentMode.ROLLING && rollingResultType == RollingReportType.NO_RESPONSE_REPORTED
                ? null
                : prevStepName
        );
        report.setCurrentStepName(mode == RecruitmentMode.ROLLING || mode == RecruitmentMode.REGULAR ? currentStepName : null);
        report.setReportedDate(mode == RecruitmentMode.ROLLING && rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : reportedDate);
        report.setStatus(ReportStatus.PENDING);

        StepDateReport saved = reportRepository.save(report);
        if (mode == RecruitmentMode.REGULAR && Boolean.TRUE.equals(request.getTodayAnnouncement())) {
            notificationService.onRegularTodayReport(company, reportedDate, reporterUserId, request.getNotificationMessage());
        }
        return new ReportCreateResponse(saved.getReportId());
    }

    @Transactional(readOnly = true)
    public List<ReportStepResponse> findStepsForCompany(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return List.of();
        }

        Company company = findCompany(companyName.trim());
        if (company == null) {
            return List.of();
        }

        List<RecruitmentChannel> channels = channelRepository.findActiveByCompanyId(company.getCompanyId());
        if (channels.isEmpty()) {
            return List.of();
        }
        return stepsForChannel(channels.get(0));
    }

    @Transactional(readOnly = true)
    public List<String> findRollingStepNameSuggestions(String companyName, String query) {
        String normalizedQuery = normalizeKeyword(query);
        Map<String, String> suggestions = new LinkedHashMap<>();

        if (companyName == null || companyName.isBlank()) {
            for (String stepName : rollingStepLogRepository.findTopStepNamesByRecruitmentMode(RecruitmentMode.ROLLING)) {
                addSuggestion(suggestions, stepName);
            }
            List<StepDateReport> recentReports = reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
            for (StepDateReport report : recentReports) {
                if (report == null) {
                    continue;
                }
                if (report.getRecruitmentMode() != RecruitmentMode.ROLLING) {
                    continue;
                }
                addSuggestion(suggestions, report.getCurrentStepName());
            }
        } else {
            Company company = findCompany(companyName.trim());
            if (company != null) {
                List<RollingStepLog> rollingLogs = rollingStepLogRepository.findByCompanyNameIgnoreCaseAndRecruitmentMode(
                    company.getCompanyName(),
                    RecruitmentMode.ROLLING
                );
                for (RollingStepLog log : rollingLogs) {
                    addSuggestion(suggestions, log == null ? null : log.getCurrentStepName());
                }
                List<StepDateReport> recentReports = reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
                for (StepDateReport report : recentReports) {
                    if (report == null) {
                        continue;
                    }
                    if (report.getRecruitmentMode() != RecruitmentMode.ROLLING) {
                        continue;
                    }
                    String reportCompanyName = report.getCompanyName();
                    if (reportCompanyName == null
                        || !normalizeCompanyKey(reportCompanyName).equals(normalizeCompanyKey(company.getCompanyName()))) {
                        continue;
                    }
                    addSuggestion(suggestions, report.getCurrentStepName());
                }
            }
            if (suggestions.isEmpty()) {
                for (String stepName : rollingStepLogRepository.findTopStepNamesByRecruitmentMode(RecruitmentMode.ROLLING)) {
                    addSuggestion(suggestions, stepName);
                }
                List<StepDateReport> recentReports = reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
                for (StepDateReport report : recentReports) {
                    if (report == null) {
                        continue;
                    }
                    if (report.getRecruitmentMode() != RecruitmentMode.ROLLING) {
                        continue;
                    }
                    addSuggestion(suggestions, report.getCurrentStepName());
                }
            }
        }

        return suggestions.values().stream()
            .filter(name -> normalizedQuery.isBlank() || normalizeKeyword(name).contains(normalizedQuery))
            .limit(20)
            .toList();
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
        if (mode == RecruitmentMode.REGULAR) {
            validateRegularFields(prevStepName, currentStepName, request.getPrevReportedDate(), reportedDate);
        } else {
            validateRollingFields(prevStepName, currentStepName, request.getPrevReportedDate(), reportedDate, rollingResultType);
        }

        report.setCompany(company);
        report.setCompanyName(companyName);
        report.setRecruitmentMode(mode);
        report.setRollingResultType(mode == RecruitmentMode.ROLLING ? rollingResultType : null);
        report.setPrevReportedDate(
            mode == RecruitmentMode.REGULAR
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
        report.setCurrentStepName(mode == RecruitmentMode.ROLLING || mode == RecruitmentMode.REGULAR ? currentStepName : null);
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

            java.util.Optional<RollingStepLog> existing;
            if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                existing = rollingStepLogRepository.findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndRollingResultTypeAndSourceType(
                    rollingCompanyName,
                    RecruitmentMode.ROLLING,
                    rollingStepName,
                    RollingReportType.NO_RESPONSE_REPORTED,
                    LogSourceType.REPORT
                );
            } else {
                existing = rollingStepLogRepository
                    .findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndPrevStepNameAndRollingResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
                        rollingCompanyName,
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
            int reportCountToApply = report.getReportCount() == null ? 1 : Math.max(report.getReportCount(), 1);
            RollingReportType regularResultType =
                report.getReportedDate() == null ? RollingReportType.NO_RESPONSE_REPORTED : RollingReportType.DATE_REPORTED;

            String regularCurrentStep = normalizeCurrentStepName(report.getCurrentStepName());
            String regularPrevStep = normalizeCurrentStepName(report.getPrevStepName());
            if (regularCurrentStep == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
            }
            final String finalRegularCurrentStep = regularCurrentStep;
            final String finalRegularPrevStep = regularPrevStep;
            String regularCompanyName = canonicalCompanyName(normalizeCompanyName(report.getCompanyName()), report.getCompany());

            java.util.Optional<RollingStepLog> existingRegular;
            if (regularResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                existingRegular = rollingStepLogRepository.findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndRollingResultTypeAndSourceType(
                    regularCompanyName,
                    RecruitmentMode.REGULAR,
                    finalRegularCurrentStep,
                    RollingReportType.NO_RESPONSE_REPORTED,
                    LogSourceType.REPORT
                );
            } else {
                existingRegular = rollingStepLogRepository
                    .findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndPrevStepNameAndRollingResultTypeAndSourceTypeAndPrevReportedDateAndReportedDate(
                        regularCompanyName,
                        RecruitmentMode.REGULAR,
                        finalRegularCurrentStep,
                        finalRegularPrevStep,
                        RollingReportType.DATE_REPORTED,
                        LogSourceType.REPORT,
                        report.getPrevReportedDate(),
                        report.getReportedDate()
                    );
            }

            RollingStepLog regularLog = existingRegular.orElseGet(() -> {
                RollingStepLog created = new RollingStepLog();
                created.setCompany(report.getCompany());
                created.setCompanyName(regularCompanyName);
                created.setCurrentStepName(finalRegularCurrentStep);
                created.setPrevStepName(regularResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : finalRegularPrevStep);
                created.setRollingResultType(regularResultType);
                created.setRecruitmentMode(RecruitmentMode.REGULAR);
                created.setSourceType(LogSourceType.REPORT);
                created.setPrevReportedDate(regularResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getPrevReportedDate());
                created.setReportedDate(regularResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getReportedDate());
                created.setReportCount(reportCountToApply);
                return created;
            });
            if (existingRegular.isPresent()) {
                int currentCount = regularLog.getReportCount() == null ? 0 : regularLog.getReportCount();
                if (regularLog.getCompany() == null && report.getCompany() != null) {
                    regularLog.setCompany(report.getCompany());
                }
                if (regularLog.getCompanyName() == null || regularLog.getCompanyName().isBlank()) {
                    regularLog.setCompanyName(regularCompanyName);
                }
                if (regularLog.getCurrentStepName() == null || regularLog.getCurrentStepName().isBlank()) {
                    regularLog.setCurrentStepName(finalRegularCurrentStep);
                }
                if (regularResultType != RollingReportType.NO_RESPONSE_REPORTED
                    && (regularLog.getPrevStepName() == null || regularLog.getPrevStepName().isBlank())) {
                    regularLog.setPrevStepName(finalRegularPrevStep);
                }
                if (regularLog.getSourceType() == null) {
                    regularLog.setSourceType(LogSourceType.REPORT);
                }
                if (regularLog.getRecruitmentMode() == null) {
                    regularLog.setRecruitmentMode(RecruitmentMode.REGULAR);
                }
                if (regularResultType != RollingReportType.NO_RESPONSE_REPORTED) {
                    if (regularLog.getPrevReportedDate() == null) {
                        regularLog.setPrevReportedDate(report.getPrevReportedDate());
                    }
                    if (regularLog.getReportedDate() == null) {
                        regularLog.setReportedDate(report.getReportedDate());
                    }
                }
                regularLog.setReportCount(currentCount + reportCountToApply);
            }
            rollingStepLogRepository.save(regularLog);
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

    private ReportAdminItem toAdminItem(StepDateReport report) {
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
            isOnHold(report)
        );
    }

    private boolean isOnHold(StepDateReport report) {
        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            return !isValidRollingReport(report);
        }
        return !isValidRegularReport(report);
    }

    private RecruitmentChannel resolveChannelForReport(StepDateReport report) {
        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            return null;
        }
        List<RecruitmentChannel> channels = channelRepository.findActiveByCompanyId(
            report.getCompany().getCompanyId());
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
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private void addSuggestion(Map<String, String> suggestions, String stepName) {
        if (stepName == null) {
            return;
        }
        String trimmed = stepName.trim();
        if (trimmed.isBlank()) {
            return;
        }
        suggestions.putIfAbsent(normalizeKeyword(trimmed), trimmed);
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
        if (mode != RecruitmentMode.ROLLING) {
            return null;
        }
        return requested == null ? RollingReportType.DATE_REPORTED : requested;
    }

    private boolean assignReportRelations(StepDateReport report) {
        boolean changed = false;
        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            Company rollingCompany = report.getCompany();
            if (rollingCompany == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
                rollingCompany = findCompany(report.getCompanyName().trim());
                if (rollingCompany != null) {
                    report.setCompany(rollingCompany);
                    report.setCompanyName(rollingCompany.getCompanyName());
                    changed = true;
                }
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

        RecruitmentChannel channel = ensureActiveChannel(company);
        List<RecruitmentStep> steps = stepRepository.findByChannelId(channel.getChannelId());
        ensureStepExists(channel, steps, report.getCurrentStepName());
    }

    private RecruitmentChannel ensureActiveChannel(Company company) {
        List<RecruitmentChannel> channels = channelRepository.findActiveByCompanyId(company.getCompanyId());
        if (!channels.isEmpty()) {
            return channels.get(0);
        }
        RecruitmentChannel created = new RecruitmentChannel();
        created.setCompany(company);
        created.setYear(LocalDate.now().getYear());
        created.setActive(true);
        return channelRepository.save(created);
    }

    private RecruitmentStep ensureStepExists(RecruitmentChannel channel,
                                             List<RecruitmentStep> existingSteps,
                                             String stepNameRaw) {
        String stepName = normalizeCurrentStepName(stepNameRaw);
        if (stepName == null) {
            return null;
        }
        String normalized = normalizeKeyword(stepName);
        for (RecruitmentStep step : existingSteps) {
            if (step == null || step.getStepName() == null) {
                continue;
            }
            if (normalizeKeyword(step.getStepName()).equals(normalized)) {
                return step;
            }
        }

        RecruitmentStep created = new RecruitmentStep();
        created.setChannel(channel);
        created.setStepName(stepName);
        RecruitmentStep saved = stepRepository.save(created);
        existingSteps.add(saved);
        return saved;
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
        if (value == null) {
            return "";
        }
        return value.toLowerCase().replaceAll("\\s+", "");
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
}
