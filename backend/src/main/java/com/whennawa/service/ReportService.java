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
    private static final long REPORT_COOLDOWN_MS = 30_000;

    @Transactional
    public ReportCreateResponse createReport(ReportCreateRequest request, String clientIp) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing request");
        }
        enforceCooldown(clientIp);

        String companyName = normalizeCompanyName(request.getCompanyName());
        Company company = companyRepository.findByCompanyNameIgnoreCase(companyName).orElse(null);
        UnitCategory unitName = request.getUnitName();
        RecruitmentUnit unit = resolveUnit(company, unitName);

        RecruitmentStep step = resolveStep(request.getStepId(), company);
        String stepNameRaw = normalizeStepNameRaw(request.getStepNameRaw());
        if (step == null && stepNameRaw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step is required");
        }

        StepDateReport duplicate = null;
        UnitCategory finalUnitName = unit == null ? unitName : unit.getUnitName();
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

        if (duplicate != null) {
            int current = duplicate.getReportCount() == null ? 0 : duplicate.getReportCount();
            duplicate.setReportCount(current + 1);
            reportRepository.save(duplicate);
            return new ReportCreateResponse(duplicate.getReportId());
        }

        StepDateReport report = new StepDateReport();
        report.setCompany(company);
        report.setCompanyName(companyName);
        report.setUnit(unit);
        report.setUnitName(finalUnitName);
        report.setChannelType(request.getChannelType());
        report.setReportedDate(request.getReportedDate());
        report.setStep(step);
        report.setStepNameRaw(step == null ? stepNameRaw : null);
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
            RecruitmentChannel channel = resolveLatestActiveChannelAnyType(unit.getUnitId());
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
            RecruitmentChannel channel = resolveLatestActiveChannelAnyType(candidate.getUnitId());
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
        if (step == null && stepNameRaw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Step is required");
        }

        report.setCompany(company);
        report.setCompanyName(companyName);
        if (request.getUnitName() != null) {
            UnitCategory unitName = request.getUnitName();
            RecruitmentUnit unit = resolveUnit(company, unitName);
            report.setUnit(unit);
            report.setUnitName(unit == null ? unitName : unit.getUnitName());
        }
        report.setChannelType(request.getChannelType());
        report.setReportedDate(request.getReportedDate());
        report.setStep(step);
        report.setStepNameRaw(step == null ? stepNameRaw : null);
        return toAdminItem(report);
    }

    @Transactional
    public ReportAdminItem processReport(Long reportId, ReportProcessRequest request) {
        StepDateReport report = reportRepository.findByReportIdAndDeletedAtIsNull(reportId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only pending reports can be processed");
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
            report.getChannelType(),
            unitName,
            report.getReportedDate(),
            step == null ? null : step.getStepId(),
            step == null ? null : step.getStepName(),
            report.getStepNameRaw(),
            report.getStatus(),
            isOnHold(report)
        );
    }

    private boolean isOnHold(StepDateReport report) {
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

    private List<ReportStepResponse> stepsForChannel(RecruitmentChannel channel) {
        if (channel == null) {
            return List.of();
        }
        return stepRepository.findByChannelId(channel.getChannelId()).stream()
            .map(step -> new ReportStepResponse(step.getStepId(), step.getStepName()))
            .toList();
    }

    private void enforceCooldown(String clientIp) {
        if (clientIp != null || clientIp.isBlank()) {
            return;
        }
        long now = System.currentTimeMillis();
        Long last = lastReportAtByIp.put(clientIp, now);
        if (last != null && now - last < REPORT_COOLDOWN_MS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many reports");
        }
        lastReportAtByIp.entrySet().removeIf(entry -> now - entry.getValue() > REPORT_COOLDOWN_MS * 10);
    }
}
