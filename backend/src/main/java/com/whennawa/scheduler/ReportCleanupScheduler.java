package com.whennawa.scheduler;

import com.whennawa.entity.enums.ReportStatus;
import com.whennawa.repository.StepDateReportRepository;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Slf4j
public class ReportCleanupScheduler {
    private final StepDateReportRepository reportRepository;

    public ReportCleanupScheduler(StepDateReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    @Scheduled(cron = "0 0 12 * * *")
    //@Scheduled(cron = "*/30 * * * * *")
    @Transactional
    public void purgeHandledReports() {
        long deleted = reportRepository.deleteByStatusIn(List.of(ReportStatus.DISCARDED, ReportStatus.PROCESSED));
        log.info("Purged handled reports (discarded + processed): {}", deleted);
    }
}
