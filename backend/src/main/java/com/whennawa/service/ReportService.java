package com.whennawa.service;

import com.whennawa.dto.report.ReportAdminItem;
import com.whennawa.dto.report.ReportCreateRequest;
import com.whennawa.dto.report.ReportCreateResponse;
import com.whennawa.dto.report.ReportProcessRequest;
import com.whennawa.dto.report.ReportStepResponse;
import com.whennawa.dto.report.ReportUpdateRequest;
import com.whennawa.entity.Company;
import com.whennawa.entity.RecruitmentChannel;
import com.whennawa.entity.RecruitmentStep;
import com.whennawa.entity.RecruitmentUnit;
import com.whennawa.entity.StepDateLog;
import com.whennawa.entity.StepDateReport;
import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.entity.enums.RecruitmentChannelType;
import com.whennawa.entity.enums.RecruitmentMode;
import com.whennawa.entity.enums.StepDateType;
import com.whennawa.entity.enums.UnitCategory;
import com.whennawa.repository.CompanyRepository;
import com.whennawa.repository.RecruitmentChannelRepository;
import com.whennawa.repository.RecruitmentStepRepository;
import com.whennawa.repository.RecruitmentUnitRepository;
import com.whennawa.repository.StepDateLogRepository;
import com.whennawa.repository.StepDateReportRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
    private final RecruitmentUnitRepository unitRepository;
    private final StepDateReportRepository reportRepository;
    private final StepDateLogRepository logRepository;
    private final ConcurrentMap<String, Long> lastReportAtByIp = new ConcurrentHashMap<>();
    @Value("${app.report.cooldown-ms:3000}")
    private long reportCooldownMs;
    @Value("${app.report.rolling-max-diff-days:92}")
    private long rollingMaxDiffDays;

    @Transactional
    public ReportCreateResponse createReport(ReportCreateRequest request, String clientIp) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing request");
        }
        enforceCooldown(clientIp);

        String companyName = normalizeCompanyName(request.getCompanyName());
        Company company = companyRepository.findByCompanyNameIgnoreCase(companyName).orElse(null);
        RecruitmentMode mode = request.getRecruitmentMode();
        if (mode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recruitment mode is required");
        }
        UnitCategory unitName = request.getUnitName();
        RecruitmentUnit unit = resolveUnit(company, unitName);
        RecruitmentStep step = resolveStep(request.getStepId(), company);
        String stepNameRaw = normalizeStepNameRaw(request.getStepNameRaw());
        String currentStepName = normalizeCurrentStepName(request.getCurrentStepName());
        LocalDate prevReportedDate = request.getPrevReportedDate();

        StepDateReport duplicate = null;
        UnitCategory finalUnitName = unit == null ? unitName : unit.getUnitName();
        if (mode == RecruitmentMode.REGULAR) {
            validateRegularFields(request.getChannelType(), request.getUnitName(), step, stepNameRaw);
            if (step != null) {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndUnitNameAndChannelTypeAndReportedDateAndStepStepIdAndStatusAndDeletedAtIsNull(
                        companyName,
                        finalUnitName,
                        request.getChannelType(),
                        request.getReportedDate(),
                        step.getStepId(),
                        ReportStatus.PENDING
                    )
                    .orElse(null);
            } else if (stepNameRaw != null) {
                duplicate = reportRepository
                    .findFirstByCompanyNameAndUnitNameAndChannelTypeAndReportedDateAndStepIsNullAndStepNameRawAndStatusAndDeletedAtIsNull(
                        companyName,
                        finalUnitName,
                        request.getChannelType(),
                        request.getReportedDate(),
                        stepNameRaw,
                        ReportStatus.PENDING
                    )
                    .orElse(null);
            }
        } else {
            validateRollingFields(currentStepName, prevReportedDate, request.getReportedDate());
            duplicate = reportRepository
                .findFirstByCompanyNameAndRecruitmentModeAndCurrentStepNameAndPrevReportedDateAndReportedDateAndStatusAndDeletedAtIsNull(
                    companyName,
                    RecruitmentMode.ROLLING,
                    currentStepName,
                    prevReportedDate,
                    request.getReportedDate(),
                    ReportStatus.PENDING
                )
                .orElse(null);
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
        report.setUnit(unit);
        report.setUnitName(mode == RecruitmentMode.REGULAR ? finalUnitName : null);
        report.setChannelType(mode == RecruitmentMode.REGULAR ? request.getChannelType() : null);
        report.setPrevReportedDate(mode == RecruitmentMode.ROLLING ? prevReportedDate : null);
        report.setCurrentStepName(mode == RecruitmentMode.ROLLING ? currentStepName : null);
        report.setReportedDate(request.getReportedDate());
        report.setStep(mode == RecruitmentMode.REGULAR ? step : null);
        report.setStepNameRaw(mode == RecruitmentMode.REGULAR && step == null ? stepNameRaw : null);
        report.setStatus(ReportStatus.PENDING);

        StepDateReport saved = reportRepository.save(report);
        return new ReportCreateResponse(saved.getReportId());
    }

    @Transactional(readOnly = true)
    public List<ReportStepResponse> findStepsForCompany(String companyName,
                                                        RecruitmentChannelType channelType,
                                                        UnitCategory unitName) {
        if (companyName == null || companyName.isBlank() || channelType == null) {
            return List.of();
        }

        Company company = companyRepository.findByCompanyNameIgnoreCase(companyName.trim()).orElse(null);
        if (company == null) {
            return List.of();
        }

        RecruitmentUnit unit = resolveUnit(company, unitName);
        if (unit != null) {
            RecruitmentChannel channel = resolveLatestActiveChannelByType(unit.getUnitId(), channelType);
            List<ReportStepResponse> steps = stepsForChannel(channel);
            if (!steps.isEmpty()) {
                return steps;
            }
        }

        List<RecruitmentUnit> units = unitRepository.findByCompanyId(company.getCompanyId());
        List<ReportStepResponse> fallbackSteps = List.of();
        int fallbackYear = -1;
        for (RecruitmentUnit candidate : units) {
            if (unit != null && candidate.getUnitId().equals(unit.getUnitId())) {
                continue;
            }
            RecruitmentChannel channel = resolveLatestActiveChannelByType(candidate.getUnitId(), channelType);
            if (channel == null) {
                continue;
            }
            List<ReportStepResponse> steps = stepsForChannel(channel);
            if (steps.isEmpty()) {
                continue;
            }
            if (channel.getYear() > fallbackYear) {
                fallbackYear = channel.getYear();
                fallbackSteps = steps;
            }
        }
        return fallbackSteps;
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
        Company company = companyRepository.findByCompanyNameIgnoreCase(companyName).orElse(null);
        RecruitmentStep step = resolveStep(request.getStepId(), company);
        String stepNameRaw = normalizeStepNameRaw(request.getStepNameRaw());
        String currentStepName = normalizeCurrentStepName(request.getCurrentStepName());
        RecruitmentMode mode = request.getRecruitmentMode();
        if (mode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recruitment mode is required");
        }
        if (mode == RecruitmentMode.REGULAR) {
            validateRegularFields(request.getChannelType(), request.getUnitName(), step, stepNameRaw);
        } else {
            validateRollingFields(currentStepName, request.getPrevReportedDate(), request.getReportedDate());
        }

        report.setCompany(company);
        report.setCompanyName(companyName);
        report.setRecruitmentMode(mode);
        if (mode == RecruitmentMode.REGULAR && request.getUnitName() != null) {
            UnitCategory unitName = request.getUnitName();
            RecruitmentUnit unit = resolveUnit(company, unitName);
            report.setUnit(unit);
            report.setUnitName(unit == null ? unitName : unit.getUnitName());
        } else if (mode == RecruitmentMode.ROLLING) {
            report.setUnit(null);
            report.setUnitName(null);
        }
        report.setChannelType(mode == RecruitmentMode.REGULAR ? request.getChannelType() : null);
        report.setPrevReportedDate(mode == RecruitmentMode.ROLLING ? request.getPrevReportedDate() : null);
        report.setCurrentStepName(mode == RecruitmentMode.ROLLING ? currentStepName : null);
        report.setReportedDate(request.getReportedDate());
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
            report.setStatus(ReportStatus.PROCESSED);
            report.setDeletedAt(LocalDateTime.now());
            return toAdminItem(report);
        }

        if (isOnHold(report)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report is on hold");
        }

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
        UnitCategory unitName = report.getUnitName();
        if (unitName == null && report.getUnit() != null) {
            unitName = report.getUnit().getUnitName();
        }
        return new ReportAdminItem(
            report.getReportId(),
            report.getReportCount(),
            report.getCompanyName(),
            report.getRecruitmentMode(),
            report.getChannelType(),
            unitName,
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
        if (report.getStep() == null && report.getStepNameRaw() != null) {
            return true;
        }
        if (report.getCompany() == null) {
            return true;
        }
        RecruitmentChannel channel = resolveChannelForReport(report);
        return channel == null;
    }

    private RecruitmentChannel resolveChannelForReport(StepDateReport report) {
        if (report.getRecruitmentMode() == RecruitmentMode.ROLLING) {
            return null;
        }
        RecruitmentUnit unit = resolveUnitForReport(report);
        if (unit != null) {
            if (report.getChannelType() == RecruitmentChannelType.ALWAYS) {
                List<RecruitmentChannel> channels = channelRepository.findActiveByUnitIdAndType(
                    unit.getUnitId(), report.getChannelType());
                return channels.isEmpty() ? null : channels.get(0);
            }
            LocalDate reportedDate = report.getReportedDate();
            int year = reportedDate == null ? 0 : reportedDate.getYear();
            RecruitmentChannel channel = channelRepository.findByUnitIdAndTypeAndYear(
                unit.getUnitId(), report.getChannelType(), year);
            return channel != null && channel.isActive() ? channel : null;
        }

        if (report.getChannelType() == RecruitmentChannelType.ALWAYS) {
            List<RecruitmentChannel> channels = channelRepository.findActiveByCompanyIdAndType(
                report.getCompany().getCompanyId(), report.getChannelType());
            return channels.isEmpty() ? null : channels.get(0);
        }
        LocalDate reportedDate = report.getReportedDate();
        int year = reportedDate == null ? 0 : reportedDate.getYear();
        RecruitmentChannel channel = channelRepository.findByCompanyIdAndTypeAndYear(
            report.getCompany().getCompanyId(), report.getChannelType(), year);
        return channel != null && channel.isActive() ? channel : null;
    }

    private RecruitmentStep resolveStep(Long stepId, Company company) {
        if (stepId == null) {
            return null;
        }
        RecruitmentStep step = stepRepository.findById(stepId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid step"));
        if (company != null
            && step.getChannel() != null
            && step.getChannel().getUnit() != null
            && step.getChannel().getUnit().getCompany() != null
            && !step.getChannel().getUnit().getCompany().getCompanyId().equals(company.getCompanyId())) {
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

    private void validateRegularFields(RecruitmentChannelType channelType,
                                       UnitCategory unitName,
                                       RecruitmentStep step,
                                       String stepNameRaw) {
        if (channelType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Channel type is required");
        }
        if (unitName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unit name is required");
        }
        if (step == null && stepNameRaw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step is required");
        }
    }

    private void validateRollingFields(String currentStepName,
                                       LocalDate prevReportedDate,
                                       LocalDate reportedDate) {
        if (currentStepName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current step name is required");
        }
        if (prevReportedDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Previous reported date is required");
        }
        if (reportedDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date is required");
        }
        long diff = java.time.temporal.ChronoUnit.DAYS.between(prevReportedDate, reportedDate);
        if (diff < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current reported date must be after previous date");
        }
        if (diff > rollingMaxDiffDays) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rolling report range cannot exceed 3 months");
        }
    }

    private boolean isValidRollingReport(StepDateReport report) {
        if (report == null) {
            return false;
        }
        if (report.getCurrentStepName() == null || report.getCurrentStepName().isBlank()) {
            return false;
        }
        if (report.getPrevReportedDate() == null || report.getReportedDate() == null) {
            return false;
        }
        long diff = java.time.temporal.ChronoUnit.DAYS.between(report.getPrevReportedDate(), report.getReportedDate());
        return diff >= 0 && diff <= rollingMaxDiffDays;
    }

    private RecruitmentUnit resolveUnit(Company company, UnitCategory unitName) {
        if (company == null || unitName == null) {
            return null;
        }
        return unitRepository.findByCompanyIdAndUnitName(company.getCompanyId(), unitName).orElse(null);
    }

    private RecruitmentUnit resolveUnitForReport(StepDateReport report) {
        if (report == null || report.getCompany() == null) {
            return null;
        }
        if (report.getUnit() != null) {
            return report.getUnit();
        }
        return resolveUnit(report.getCompany(), report.getUnitName());
    }

    private RecruitmentChannel resolveLatestActiveChannelAnyType(Long unitId) {
        if (unitId == null) {
            return null;
        }
        List<RecruitmentChannel> channels = channelRepository.findActiveByUnitIdOrderByYearDesc(unitId);
        return channels.isEmpty() ? null : channels.get(0);
    }

    private RecruitmentChannel resolveLatestActiveChannelByType(Long unitId, RecruitmentChannelType channelType) {
        if (unitId == null || channelType == null) {
            return null;
        }
        List<RecruitmentChannel> channels = channelRepository.findActiveByUnitIdAndType(unitId, channelType);
        return channels.isEmpty() ? null : channels.get(0);
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
                rollingCompany = companyRepository.findByCompanyNameIgnoreCase(report.getCompanyName().trim()).orElse(null);
                if (rollingCompany != null) {
                    report.setCompany(rollingCompany);
                    changed = true;
                }
            }
            return changed;
        }

        Company company = report.getCompany();
        if (company == null && report.getCompanyName() != null && !report.getCompanyName().isBlank()) {
            company = companyRepository.findByCompanyNameIgnoreCase(report.getCompanyName().trim()).orElse(null);
            if (company != null) {
                report.setCompany(company);
                changed = true;
            }
        }

        if (report.getUnit() == null && company != null && report.getUnitName() != null) {
            RecruitmentUnit unit = resolveUnit(company, report.getUnitName());
            if (unit != null) {
                report.setUnit(unit);
                report.setUnitName(unit.getUnitName());
                changed = true;
            }
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
