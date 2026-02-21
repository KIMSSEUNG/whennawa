package com.whennawa.service;

import com.whennawa.config.AppProperties;
import com.whennawa.dto.report.ReportAdminItem;
import com.whennawa.dto.report.ReportCreateRequest;
import com.whennawa.dto.report.ReportCreateResponse;
import com.whennawa.dto.report.ReportProcessRequest;
import com.whennawa.dto.report.ReportStepResponse;
import com.whennawa.dto.report.ReportUpdateRequest;
import com.whennawa.entity.Company;
import com.whennawa.entity.RecruitmentChannel;
import com.whennawa.entity.RecruitmentStep;
import com.whennawa.entity.RollingStepLog;
import com.whennawa.entity.StepDateLog;
import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RollingReportType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.StepDateType;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.RecruitmentChannelRepository;
import com.whennawa.repository.RecruitmentStepRepository;
import com.whennawa.repository.RollingStepLogRepository;
import com.whennawa.repository.StepDateLogRepository;
import com.whennawa.repository.StepDateReportRepository;
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
    private final StepDateLogRepository logRepository;
    private final AppProperties appProperties;
    private final ConcurrentMap<String, Long> lastReportAtByIp = new ConcurrentHashMap<>();

    @Transactional
    public ReportCreateResponse createReport(ReportCreateRequest request, String clientIp) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing request");
        }
        enforceCooldown(clientIp);

        String companyName = normalizeCompanyName(request.getCompanyName());
        Company company = findCompany(companyName);
        RecruitmentMode mode = request.getRecruitmentMode();
        if (mode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recruitment mode is required");
        }
        RecruitmentStep step = resolveStep(request.getStepId(), company);
        String stepNameRaw = normalizeStepNameRaw(request.getStepNameRaw());
        String currentStepName = normalizeCurrentStepName(request.getCurrentStepName());
        RollingReportType rollingResultType = resolveRollingResultType(mode, request.getRollingResultType());
        LocalDate prevReportedDate = request.getPrevReportedDate();
        LocalDate reportedDate = request.getReportedDate();

        StepDateReport duplicate = null;
        if (mode == RecruitmentMode.REGULAR) {
            validateRegularFields(step, stepNameRaw, prevReportedDate, reportedDate);
            if (step != null) {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndReportedDateAndStepStepIdAndStatusAndDeletedAtIsNull(
                        companyName,
                        reportedDate,
                        step.getStepId(),
                        ReportStatus.PENDING
                    )
                    .orElse(null);
            } else if (stepNameRaw != null) {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndReportedDateAndStepIsNullAndStepNameRawAndStatusAndDeletedAtIsNull(
                        companyName,
                        reportedDate,
                        stepNameRaw,
                        ReportStatus.PENDING
                    )
                    .orElse(null);
            }
        } else {
            validateRollingFields(currentStepName, prevReportedDate, reportedDate, rollingResultType);
            if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndCurrentStepNameAndStatusAndDeletedAtIsNull(
                        companyName,
                        RecruitmentMode.ROLLING,
                        RollingReportType.NO_RESPONSE_REPORTED,
                        currentStepName,
                        ReportStatus.PENDING
                    )
                    .orElse(null);
            } else {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndRecruitmentModeAndRollingResultTypeAndCurrentStepNameAndPrevReportedDateAndReportedDateAndStatusAndDeletedAtIsNull(
                        companyName,
                        RecruitmentMode.ROLLING,
                        rollingResultType,
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
            reportRepository.save(duplicate);
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
        report.setCurrentStepName(mode == RecruitmentMode.ROLLING ? currentStepName : null);
        report.setReportedDate(mode == RecruitmentMode.ROLLING && rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : reportedDate);
        report.setStep(mode == RecruitmentMode.REGULAR ? step : null);
        report.setStepNameRaw(mode == RecruitmentMode.REGULAR && step == null ? stepNameRaw : null);
        report.setStatus(ReportStatus.PENDING);

        StepDateReport saved = reportRepository.save(report);
        return new ReportCreateResponse(saved.getReportId());
    }

    @Transactional(readOnly = true)
    public List<ReportStepResponse> findStepsForCompany(String companyName) {
        if (companyName == null || companyName.isBlank()) {
            return List.of();
        }

        Company company = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName.trim()).orElse(null);
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
            for (String stepName : rollingStepLogRepository.findTopStepNames()) {
                addSuggestion(suggestions, stepName);
            }
            List<StepDateReport> recentReports = reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
            for (StepDateReport report : recentReports) {
                if (report == null) {
                    continue;
                }
                addSuggestion(suggestions, report.getCurrentStepName());
                addSuggestion(suggestions, report.getStepNameRaw());
            }
        } else {
            Company company = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName.trim()).orElse(null);
            if (company != null) {
                List<RollingStepLog> rollingLogs = rollingStepLogRepository.findByCompanyNameIgnoreCase(company.getCompanyName());
                for (RollingStepLog log : rollingLogs) {
                    addSuggestion(suggestions, log == null ? null : log.getCurrentStepName());
                }
                List<StepDateReport> recentReports = reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
                for (StepDateReport report : recentReports) {
                    if (report == null) {
                        continue;
                    }
                    String reportCompanyName = report.getCompanyName();
                    if (reportCompanyName == null
                        || !reportCompanyName.trim().equalsIgnoreCase(company.getCompanyName())) {
                        continue;
                    }
                    addSuggestion(suggestions, report.getCurrentStepName());
                    addSuggestion(suggestions, report.getStepNameRaw());
                }
            }
            if (suggestions.isEmpty()) {
                for (String stepName : rollingStepLogRepository.findTopStepNames()) {
                    addSuggestion(suggestions, stepName);
                }
                List<StepDateReport> recentReports = reportRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc();
                for (StepDateReport report : recentReports) {
                    if (report == null) {
                        continue;
                    }
                    addSuggestion(suggestions, report.getCurrentStepName());
                    addSuggestion(suggestions, report.getStepNameRaw());
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

        String companyName = normalizeCompanyName(request.getCompanyName());
        Company company = findCompany(companyName);
        RecruitmentStep step = resolveStep(request.getStepId(), company);
        String stepNameRaw = normalizeStepNameRaw(request.getStepNameRaw());
        String currentStepName = normalizeCurrentStepName(request.getCurrentStepName());
        RecruitmentMode mode = request.getRecruitmentMode();
        if (mode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recruitment mode is required");
        }
        RollingReportType rollingResultType = resolveRollingResultType(mode, request.getRollingResultType());
        LocalDate reportedDate = request.getReportedDate();
        if (mode == RecruitmentMode.REGULAR) {
            validateRegularFields(step, stepNameRaw, request.getPrevReportedDate(), reportedDate);
        } else {
            validateRollingFields(currentStepName, request.getPrevReportedDate(), reportedDate, rollingResultType);
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
        report.setCurrentStepName(mode == RecruitmentMode.ROLLING ? currentStepName : null);
        report.setReportedDate(
            mode == RecruitmentMode.ROLLING && rollingResultType == RollingReportType.NO_RESPONSE_REPORTED
                ? null
                : reportedDate
        );
        report.setStep(mode == RecruitmentMode.REGULAR ? step : null);
        report.setStepNameRaw(mode == RecruitmentMode.REGULAR && step == null ? stepNameRaw : null);
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
    public ReportAdminItem processReport(Long reportId, ReportProcessRequest request) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be processed");
        }

        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            if (!isValidRollingReport(report)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rolling report data is invalid");
            }
            int reportCountToApply = report.getReportCount() == null ? 1 : Math.max(report.getReportCount(), 1);
            RollingReportType rollingResultType = report.getRollingResultType() == null
                ? RollingReportType.DATE_REPORTED
                : report.getRollingResultType();
            String rollingStepName = normalizeCurrentStepName(report.getCurrentStepName());
            if (rollingStepName == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
            }
            String rollingCompanyName = normalizeCompanyName(report.getCompanyName());

            java.util.Optional<RollingStepLog> existing;
            if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                existing = rollingStepLogRepository.findFirstByCompanyNameAndCurrentStepNameAndRollingResultType(
                    rollingCompanyName,
                    rollingStepName,
                    RollingReportType.NO_RESPONSE_REPORTED
                );
            } else {
                existing = rollingStepLogRepository
                    .findFirstByCompanyNameAndCurrentStepNameAndRollingResultTypeAndPrevReportedDateAndReportedDate(
                        rollingCompanyName,
                        rollingStepName,
                        rollingResultType,
                        report.getPrevReportedDate(),
                        report.getReportedDate()
                    );
            }

            RollingStepLog rollingLog = existing.orElseGet(() -> {
                RollingStepLog created = new RollingStepLog();
                created.setCompany(report.getCompany());
                created.setCompanyName(rollingCompanyName);
                created.setCurrentStepName(rollingStepName);
                created.setRollingResultType(rollingResultType);
                created.setPrevReportedDate(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getPrevReportedDate());
                created.setReportedDate(rollingResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getReportedDate());
                created.setReportCount(reportCountToApply);
                return created;
            });
            if (existing.isPresent()) {
                int currentCount = rollingLog.getReportCount() == null ? 0 : rollingLog.getReportCount();
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

            String regularCurrentStep = normalizeCurrentStepName(report.getStepNameRaw());
            if (regularCurrentStep == null && report.getStep() != null) {
                regularCurrentStep = normalizeCurrentStepName(report.getStep().getStepName());
            }
            if (regularCurrentStep == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
            }
            final String finalRegularCurrentStep = regularCurrentStep;
            String regularCompanyName = normalizeCompanyName(report.getCompanyName());

            java.util.Optional<RollingStepLog> existingRegular;
            if (regularResultType == RollingReportType.NO_RESPONSE_REPORTED) {
                existingRegular = rollingStepLogRepository.findFirstByCompanyNameAndCurrentStepNameAndRollingResultType(
                    regularCompanyName,
                    finalRegularCurrentStep,
                    RollingReportType.NO_RESPONSE_REPORTED
                );
            } else {
                existingRegular = rollingStepLogRepository
                    .findFirstByCompanyNameAndCurrentStepNameAndRollingResultTypeAndPrevReportedDateAndReportedDate(
                        regularCompanyName,
                        finalRegularCurrentStep,
                        RollingReportType.DATE_REPORTED,
                        report.getPrevReportedDate(),
                        report.getReportedDate()
                    );
            }

            RollingStepLog regularLog = existingRegular.orElseGet(() -> {
                RollingStepLog created = new RollingStepLog();
                created.setCompany(report.getCompany());
                created.setCompanyName(regularCompanyName);
                created.setCurrentStepName(finalRegularCurrentStep);
                created.setRollingResultType(regularResultType);
                created.setPrevReportedDate(regularResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getPrevReportedDate());
                created.setReportedDate(regularResultType == RollingReportType.NO_RESPONSE_REPORTED ? null : report.getReportedDate());
                created.setReportCount(reportCountToApply);
                return created;
            });
            if (existingRegular.isPresent()) {
                int currentCount = regularLog.getReportCount() == null ? 0 : regularLog.getReportCount();
                regularLog.setReportCount(currentCount + reportCountToApply);
            }
            rollingStepLogRepository.save(regularLog);
            report.setStatus(ReportStatus.PROCESSED);
            report.setDeletedAt(LocalDateTime.now());
            return toAdminItem(report);
        }

        // Legacy regular flow fallback (step-id based).
        RecruitmentStep step = report.getStep();
        if (request != null && request.getStepId() != null) {
            step = resolveStep(request.getStepId(), report.getCompany());
        }
        if (step == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step is required");
        }
        final RecruitmentStep finalStep = step;

        LocalDate reportedDate = report.getReportedDate();
        if (reportedDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reported date is required");
        }

        LocalDateTime targetDate = reportedDate.atStartOfDay();
        Optional<StepDateLog> existing = logRepository.findByStepStepIdAndTargetDateAndDateType(
            finalStep.getStepId(), targetDate, StepDateType.REPORT);
        int reportCountToApply = report.getReportCount() == null ? 1 : Math.max(report.getReportCount(), 1);
        StepDateLog log = existing.orElseGet(() -> {
            StepDateLog created = new StepDateLog();
            created.setStep(finalStep);
            created.setTargetDate(targetDate);
            created.setDateType(StepDateType.REPORT);
            created.setReportCount(reportCountToApply);
            return created;
        });
        if (existing.isPresent()) {
            int count = log.getReportCount() == null ? 0 : log.getReportCount();
            log.setReportCount(count + reportCountToApply);
        }
        logRepository.save(log);

        report.setStep(finalStep);
        report.setStepNameRaw(null);
        report.setStatus(ReportStatus.PROCESSED);
        report.setDeletedAt(LocalDateTime.now());
        return toAdminItem(report);
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
        RecruitmentStep step = report.getStep();
        return new ReportAdminItem(
            report.getReportId(),
            report.getReportCount(),
            report.getCompanyName(),
            report.getRecruitmentMode(),
            report.getRollingResultType(),
            report.getPrevReportedDate(),
            report.getCurrentStepName(),
            report.getReportedDate(),
            step == null ? null : step.getStepId(),
            step == null ? null : step.getStepName(),
            report.getStepNameRaw(),
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

    private RecruitmentStep resolveStep(Long stepId, Company company) {
        if (stepId == null) {
            return null;
        }
        RecruitmentStep step = stepRepository.findById(stepId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid step"));
        if (company != null
            && step.getChannel() != null
            && step.getChannel().getCompany() != null
            && !step.getChannel().getCompany().getCompanyId().equals(company.getCompanyId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step does not belong to company");
        }
        return step;
    }

    private String normalizeCompanyName(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company name is required");
        }
        return raw.trim();
    }

    private Company findCompany(String companyName) {
        return companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(companyName).orElse(null);
    }

    private String normalizeStepNameRaw(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isBlank() ? null : trimmed;
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

    private void validateRegularFields(RecruitmentStep step,
                                       String stepNameRaw,
                                       LocalDate prevReportedDate,
                                       LocalDate reportedDate) {
        if (step == null && stepNameRaw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step is required");
        }
        if (reportedDate != null && reportedDate.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date cannot be in the future");
        }
        if (prevReportedDate != null && reportedDate != null && !prevReportedDate.isBefore(reportedDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date must be after previous date");
        }
    }

    private void validateRollingFields(String currentStepName,
                                       LocalDate prevReportedDate,
                                       LocalDate reportedDate,
                                       RollingReportType rollingResultType) {
        if (currentStepName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
        }
        if (rollingResultType == RollingReportType.NO_RESPONSE_REPORTED) {
            return;
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
        String currentStepName = normalizeCurrentStepName(report.getStepNameRaw());
        if (currentStepName == null && report.getStep() != null) {
            currentStepName = normalizeCurrentStepName(report.getStep().getStepName());
        }
        if (currentStepName == null) {
            return false;
        }
        LocalDate prevDate = report.getPrevReportedDate();
        LocalDate currentDate = report.getReportedDate();
        if (prevDate == null && currentDate == null) {
            // no-response report: current step only
            return true;
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

    private RecruitmentStep resolveStepByNameForReport(StepDateReport report) {
        String raw = normalizeStepNameRaw(report.getStepNameRaw());
        if (raw == null) {
            return null;
        }
        RecruitmentChannel channel = resolveChannelForReport(report);
        if (channel == null) {
            return null;
        }
        String normalizedRaw = normalizeKeyword(raw);
        return stepRepository.findByChannelId(channel.getChannelId()).stream()
            .filter(step -> normalizeKeyword(step.getStepName()).equals(normalizedRaw))
            .findFirst()
            .orElse(null);
    }

    private boolean assignReportRelations(StepDateReport report) {
        boolean changed = false;
        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            Company rollingCompany = report.getCompany();
            if (rollingCompany == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
                rollingCompany = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(report.getCompanyName().trim()).orElse(null);
                if (rollingCompany != null) {
                    report.setCompany(rollingCompany);
                    changed = true;
                }
            }
            return changed;
        }

        Company company = report.getCompany();
        if (company == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
            company = companyRepository.findByCompanyNameIgnoreCaseAndIsActiveTrue(report.getCompanyName().trim()).orElse(null);
            if (company == null) {
                Company created = new Company();
                created.setCompanyName(report.getCompanyName().trim());
                created.setActive(true);
                company = companyRepository.save(created);
            }
            report.setCompany(company);
            changed = true;
        }
        if (report.getStep() == null && company != null) {
            RecruitmentStep matched = resolveStepByNameForReport(report);
            if (matched != null) {
                report.setStep(matched);
                report.setStepNameRaw(null);
                changed = true;
            }
        }
        return changed;
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
}
