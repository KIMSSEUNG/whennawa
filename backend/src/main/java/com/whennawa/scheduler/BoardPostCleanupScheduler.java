package com.whennawa.scheduler;

import com.whennawa.config.AppProperties;
import com.whennawa.service.BoardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class BoardPostCleanupScheduler {
    private final BoardService boardService;
    private final AppProperties appProperties;

    @Scheduled(cron = "${app.scheduler.board-post-cleanup-cron:0 0 0 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void purgeOldBoardPosts() {
        long retentionDays = appProperties.getScheduler().getBoardPostRetentionDays();
        long deleted = boardService.purgeOldPosts(retentionDays);
        log.info("Purged board posts older than {} days: {}", retentionDays, deleted);
    }
}
