package com.whennawa.scheduler;

import com.whennawa.repository.ChatMessageRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatCleanupScheduler {
    private final ChatMessageRepository chatMessageRepository;

    @Transactional
    @Scheduled(cron = "0 0 3 * * *")
    public void purgeOldMessages() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(5);
        long deleted = chatMessageRepository.deleteByCreatedAtBefore(cutoff);
        log.info("Purged chat messages older than 5 days: {}", deleted);
    }
}
