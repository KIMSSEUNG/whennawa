package com.whennawa.scheduler;

import com.whennawa.repository.ChatMessageRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatCleanupScheduler {
    private final ChatMessageRepository chatMessageRepository;
    @Value("${app.scheduler.chat-retention-days:5}")
    private long chatRetentionDays;

    @Transactional
    @Scheduled(cron = "${app.scheduler.chat-cleanup-cron:0 0 3 * * *}")
    public void purgeOldMessages() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(chatRetentionDays);
        long deleted = chatMessageRepository.deleteByCreatedAtBefore(cutoff);
        log.info("Purged chat messages older than {} days: {}", chatRetentionDays, deleted);
    }
}
